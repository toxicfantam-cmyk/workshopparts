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
    err.response = { data, status: res.status };
    throw err;
  }
  return data;
}

async function runEndToEndWorkflowTest() {
  console.log('================================================================');
  console.log('🧪 RUNNING WORKSHOPPARTS END-TO-END WORKFLOW VERIFICATION TEST');
  console.log('================================================================');

  // Step 0: Login as Inventory Manager
  console.log('\n[Step 0] Logging in as Inventory Manager (manager@workshopparts.com)...');
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: {
      email: 'manager@workshopparts.com',
      password: 'manager123',
    },
  });

  const managerToken = loginRes.token;
  const managerHeader = { Authorization: `Bearer ${managerToken}` };
  console.log('✅ Successfully authenticated as Inventory Manager.');

  // Also get Admin Token for approvals
  const adminLoginRes = await req('/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@workshopparts.com',
      password: 'admin123',
    },
  });
  const adminHeader = { Authorization: `Bearer ${adminLoginRes.token}` };
  console.log('✅ Successfully authenticated as Admin.');

  // Find brake pads (PRT-BRK-001) and oil filter (PRT-FLT-001)
  const partsRes = await req('/parts?search=PRT-BRK-001', { headers: managerHeader });
  const brakePad = partsRes.data.find((p) => p.sku === 'PRT-BRK-001');
  const oilFilterRes = await req('/parts?search=PRT-FLT-001', { headers: managerHeader });
  const oilFilter = oilFilterRes.data.find((p) => p.sku === 'PRT-FLT-001');

  console.log(`\nInitial State of Part ${brakePad.sku} (${brakePad.name}):`);
  console.log(`- Total: ${brakePad.totalQuantity}, Reserved: ${brakePad.reservedQuantity}, Available: ${brakePad.availableQuantity}`);

  // Step 1: Create a repair job requiring 2 brake pads and 1 oil filter
  console.log('\n[Step 1] Creating a repair job requiring 2 brake pads and 1 oil filter...');
  const createJobRes = await req('/repair-jobs', {
    method: 'POST',
    headers: managerHeader,
    body: {
      customerName: 'Aakash Verma (Workflow Test)',
      customerPhone: '+91 98989 11223',
      vehicleDetails: { make: 'Maruti Suzuki', model: 'Swift ZXi', year: 2022 },
      registrationNumber: `MH-02-WF-${Math.floor(1000 + Math.random() * 9000)}`,
      description: 'End-to-End Test: Front brake pad replacement and routine oil filter change',
      priority: 'High',
      requiredParts: [
        { partId: brakePad._id, quantityRequired: 2 },
        { partId: oilFilter._id, quantityRequired: 1 },
      ],
      estimatedLaborCost: 1500,
    },
  });

  const job = createJobRes.job;
  console.log(`✅ Created Job: ${job.jobId}`);

  // Step 2 & 3: Check status - since PRT-BRK-001 has 0 available units, job must be 'Waiting for Parts'
  console.log('\n[Step 2 & 3] Checking automatic inventory validation and job status...');
  console.log(`- Job Status: "${job.status}"`);
  if (job.status !== 'Waiting for Parts') {
    throw new Error(`Expected status "Waiting for Parts", got "${job.status}"`);
  }
  console.log('✅ System automatically flagged the job as "Waiting for Parts"!');

  // Step 4: Display exact shortage
  console.log('\n[Step 4] Querying job details for exact shortage analysis...');
  const jobDetailRes = await req(`/repair-jobs/${job._id}`, { headers: managerHeader });
  const stockAnalysis = jobDetailRes.stockAnalysis;
  console.log('Stock Shortage Breakdown:');
  stockAnalysis.forEach((item) => {
    console.log(
      `  • ${item.partName} (${item.sku}): Required=${item.quantityRequired}, Reserved=${item.quantityReserved}, InStock=${item.availableInStock}, Shortage=${item.shortage}`
    );
  });

  const brakeShortage = stockAnalysis.find((s) => s.sku === 'PRT-BRK-001');
  if (!brakeShortage || brakeShortage.shortage < 2) {
    throw new Error('Shortage calculation mismatch for brake pad');
  }
  console.log(`✅ Exact shortage identified: ${brakeShortage.shortage} units missing.`);

  // Step 5: Inventory manager generates a purchase request for the missing quantity
  console.log('\n[Step 5] Generating purchase request for the missing quantity (plus restock buffer)...');
  const createPRRes = await req('/purchase-requests', {
    method: 'POST',
    headers: managerHeader,
    body: {
      supplierId: brakePad.supplier?._id || brakePad.supplier,
      priority: 'High',
      reason: `Emergency shortage for ${job.jobId}`,
      linkedRepairJobId: job._id,
      items: [
        {
          partId: brakePad._id,
          quantityRequested: brakeShortage.shortage + 4, // order 6 to satisfy 2 shortage + restock 4
          estimatedUnitPrice: brakePad.purchasePrice,
        },
      ],
    },
  });

  const pr = createPRRes.purchaseRequest;
  console.log(`✅ Generated Purchase Request: ${pr.requestNumber} with status "${pr.status}"`);

  // Step 6: PR gets approved and marked as ordered
  console.log('\n[Step 6] Approving purchase request and marking as Ordered...');
  await req(`/purchase-requests/${pr._id}/status`, {
    method: 'PATCH',
    headers: adminHeader,
    body: { status: 'Approved' },
  });
  console.log('  - PR Approved by Admin');

  await req(`/purchase-requests/${pr._id}/status`, {
    method: 'PATCH',
    headers: managerHeader,
    body: { status: 'Ordered' },
  });
  console.log('  - PR Marked as Ordered from Supplier');

  // Step 7 & 8: Record received stock and check inventory auto-update
  console.log('\n[Step 7 & 8] Manager records received stock delivery...');
  const receiveRes = await req(`/purchase-requests/${pr._id}/receive`, {
    method: 'POST',
    headers: managerHeader,
    body: {
      receivedItems: [
        {
          partId: brakePad._id,
          quantityReceived: 6,
        },
      ],
      deliveryNoteNumber: 'DN-TEST-WF-001',
    },
  });

  console.log(`✅ ${receiveRes.message}`);
  if (receiveRes.promotedJobs) {
    console.log(`  - Promoted waiting jobs:`, receiveRes.promotedJobs);
  }

  // Step 9 & 10: Verify the waiting repair job became "In Progress"
  console.log('\n[Step 9 & 10] Verifying waiting repair job transition and part reservations...');
  const updatedJobRes = await req(`/repair-jobs/${job._id}`, { headers: managerHeader });
  const updatedJob = updatedJobRes.job;

  console.log(`- Final Job Status: "${updatedJob.status}"`);
  console.log(`- Required Parts Reservation Status:`);
  updatedJob.requiredParts.forEach((p) => {
    console.log(`  • ${p.partName}: Required=${p.quantityRequired}, Reserved=${p.quantityReserved}, isReserved=${p.isReserved}`);
  });

  if (updatedJob.status !== 'In Progress') {
    throw new Error(`Expected final job status "In Progress", got "${updatedJob.status}"`);
  }

  const allPartsReserved = updatedJob.requiredParts.every((p) => p.quantityReserved >= p.quantityRequired);
  if (!allPartsReserved) {
    throw new Error('Not all required parts were reserved!');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 10 STEPS OF THE END-TO-END WORKFLOW PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runEndToEndWorkflowTest().catch((err) => {
  console.error('\n❌ Test failed with error:', err.response?.data || err.message);
  process.exit(1);
});
