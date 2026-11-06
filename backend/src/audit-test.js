const BASE_URL = 'http://localhost:5001/api';

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.response = { data, status: res.status };
    throw err;
  }
  return data;
}

async function runComprehensiveAudit() {
  console.log('========================================================================');
  console.log('🔍 FULL WORKSHOPPARTS SYSTEM AUDIT — TESTING ALL MODULES & PERMISSIONS');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Health Check
  try {
    const health = await req('/health');
    assert(health.status === 'healthy', 'Health check responds with healthy status');
  } catch (e) {
    assert(false, `Health check failed: ${e.message}`);
  }

  // 2. Authentication: 3 Roles
  let adminToken, managerToken, techToken;
  try {
    const adminRes = await req('/auth/login', {
      method: 'POST',
      body: { email: 'admin@workshopparts.com', password: 'admin123' },
    });
    adminToken = adminRes.token;
    assert(adminRes.user.role === 'Admin', 'Admin login successful with Admin role');

    const managerRes = await req('/auth/login', {
      method: 'POST',
      body: { email: 'manager@workshopparts.com', password: 'manager123' },
    });
    managerToken = managerRes.token;
    assert(managerRes.user.role === 'Inventory Manager', 'Manager login successful with Inventory Manager role');

    const techRes = await req('/auth/login', {
      method: 'POST',
      body: { email: 'rajesh.tech@workshopparts.com', password: 'tech123' },
    });
    techToken = techRes.token;
    assert(techRes.user.role === 'Technician', 'Technician login successful with Technician role');
  } catch (e) {
    assert(false, `Auth testing failed: ${e.message}`);
  }

  const adminH = { Authorization: `Bearer ${adminToken}` };
  const managerH = { Authorization: `Bearer ${managerToken}` };
  const techH = { Authorization: `Bearer ${techToken}` };

  // 3. User verification (/auth/me and /auth/users)
  try {
    const meRes = await req('/auth/me', { headers: managerH });
    assert(meRes.user.name === 'Suresh Patel', 'Profile /auth/me returns current authenticated user');

    const usersRes = await req('/auth/users?role=Technician', { headers: managerH });
    assert(usersRes.users.length >= 2, `Technicians list returns ${usersRes.users.length} active technicians`);
  } catch (e) {
    assert(false, `User endpoints failed: ${e.message}`);
  }

  // 4. Dashboard Stats & Charts
  try {
    const dash = await req('/dashboard/stats', { headers: managerH });
    assert(dash.stats.totalPartsCount >= 20, `Dashboard reports ${dash.stats.totalPartsCount} total parts (>= 20)`);
    assert(dash.stats.totalStockValue > 0, `Dashboard reports total stock value: ₹${dash.stats.totalStockValue.toLocaleString('en-IN')}`);
    assert(dash.charts.categoryDistribution.length > 0, 'Dashboard charts: category distribution data populated');
    assert(dash.charts.jobStatusData.length > 0, 'Dashboard charts: job pipeline breakdown populated');
    assert(dash.charts.movementChartData.length > 0, 'Dashboard charts: monthly movement trend populated');
  } catch (e) {
    assert(false, `Dashboard failed: ${e.message}`);
  }

  // 5. Parts Catalogue Module
  let testPartId;
  try {
    const partsRes = await req('/parts?limit=50', { headers: managerH });
    assert(partsRes.data.length >= 20, `Parts catalogue contains ${partsRes.data.length} spare parts`);

    const cats = await req('/parts/categories', { headers: managerH });
    assert(cats.categories.length >= 6, `Categories endpoint returns ${cats.categories.length} categories: ${cats.categories.slice(0, 4).join(', ')}...`);

    // Verify filter by stock status
    const outOfStock = await req('/parts?stockStatus=out_of_stock', { headers: managerH });
    assert(outOfStock.data.every((p) => p.availableQuantity <= 0), 'Stock status filter "out_of_stock" returns parts with <= 0 available units');

    // Get Part By ID
    testPartId = partsRes.data[0]._id;
    const partDetail = await req(`/parts/${testPartId}`, { headers: managerH });
    assert(partDetail.part && partDetail.part.sku, `Part detail returns populated SKU: ${partDetail.part.sku}`);
  } catch (e) {
    assert(false, `Parts catalogue failed: ${e.message}`);
  }

  // 6. RBAC Security Check
  try {
    // Technician should NOT be authorized to delete a part
    let blocked = false;
    try {
      await req(`/parts/${testPartId}`, { method: 'DELETE', headers: techH });
    } catch (err) {
      if (err.status === 403) blocked = true;
    }
    assert(blocked, 'RBAC check: Technician is strictly blocked (HTTP 403) from deleting parts');
  } catch (e) {
    assert(false, `RBAC check failed: ${e.message}`);
  }

  // 7. Inventory & Movements Module
  try {
    const movs = await req('/inventory/movements?limit=10', { headers: managerH });
    assert(movs.data.length > 0, `Inventory audit log has ${movs.pagination.total} historical stock movements`);

    // Test Manual Stock Adjustment with negative prevention
    const partsRes = await req('/parts?limit=1', { headers: managerH });
    const p = partsRes.data[0];

    // Decreasing more than available should be blocked
    let preventedNegative = false;
    try {
      await req('/inventory/adjust', {
        method: 'POST',
        headers: managerH,
        body: {
          partId: p._id,
          adjustmentType: 'DECREASE',
          quantity: 99999, // way higher than stock
          reason: 'Negative test',
        },
      });
    } catch (err) {
      if (err.status === 400 && err.message.includes('Negative stock is not allowed')) {
        preventedNegative = true;
      }
    }
    assert(preventedNegative, 'Negative Stock Rule: System rejected decrease exceeding unreserved available stock');
  } catch (e) {
    assert(false, `Inventory testing failed: ${e.message}`);
  }

  // 8. Alerts Hub
  try {
    const alerts = await req('/inventory/alerts', { headers: managerH });
    assert(alerts.success, 'Inventory alerts endpoint returned success');
    assert(alerts.waitingJobsCount >= 0, `Identified ${alerts.waitingJobsCount} jobs waiting for parts`);
    assert(alerts.outOfStockCount >= 0, `Identified ${alerts.outOfStockCount} out-of-stock items`);
  } catch (e) {
    assert(false, `Alerts hub failed: ${e.message}`);
  }

  // 9. Suppliers Module
  try {
    const sups = await req('/suppliers', { headers: managerH });
    assert(sups.suppliers.length >= 5, `Supplier directory contains ${sups.suppliers.length} authorized suppliers (>= 5)`);
    assert(sups.suppliers[0].partsCount !== undefined, 'Suppliers have attached partsCount metrics');

    const supDetail = await req(`/suppliers/${sups.suppliers[0]._id}`, { headers: managerH });
    assert(supDetail.parts.length > 0, `Supplier detail returns supplied parts and order stats: ${supDetail.stats.totalParts} parts`);
  } catch (e) {
    assert(false, `Suppliers failed: ${e.message}`);
  }

  // 10. Reports Module
  try {
    const valRep = await req('/reports/valuation', { headers: managerH });
    assert(valRep.summary.totalCostValuation > 0, `Valuation report calculated total cost ₹${valRep.summary.totalCostValuation.toLocaleString('en-IN')}`);
    assert(valRep.summary.potentialGrossProfit > 0, `Valuation report calculated potential gross profit ₹${valRep.summary.potentialGrossProfit.toLocaleString('en-IN')}`);

    const consRep = await req('/reports/consumption', { headers: managerH });
    assert(Array.isArray(consRep.data), 'Consumption report returned array of consumed items');

    const waitRep = await req('/reports/waiting-jobs', { headers: managerH });
    assert(Array.isArray(waitRep.data), `Waiting jobs report returned ${waitRep.count} bottleneck tickets`);

    const spendRep = await req('/reports/spending', { headers: managerH });
    assert(spendRep.totalSpent >= 0, `Spending report returned spend breakdown: ₹${spendRep.totalSpent.toLocaleString('en-IN')}`);
  } catch (e) {
    assert(false, `Reports failed: ${e.message}`);
  }

  console.log('\n========================================================================');
  console.log(`📊 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveAudit().catch((err) => {
  console.error('Audit script encountered unexpected fatal error:', err);
  process.exit(1);
});
