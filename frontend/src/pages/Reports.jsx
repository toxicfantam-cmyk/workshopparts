import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  IndianRupee,
  Layers,
  Clock,
  TrendingUp,
  Package,
  Calendar,
  Filter,
} from 'lucide-react';
import { reportsAPI, partsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { exportToCSV } from '../utils/exportCsv';
import { formatCurrency, formatDate } from '../utils/formatters';

export const Reports = () => {
  const { isManager } = useAuth();
  const { showToast } = useNotification();

  const [activeReportTab, setActiveReportTab] = useState('valuation');
  const [loading, setLoading] = useState(true);

  // Report Data States
  const [valuationData, setValuationData] = useState(null);
  const [consumptionData, setConsumptionData] = useState([]);
  const [waitingJobsData, setWaitingJobsData] = useState([]);
  const [spendingData, setSpendingData] = useState(null);

  // Filters
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    partsAPI.getCategories().then((res) => {
      if (res.data.success) setCategories(res.data.categories);
    });
  }, []);

  const fetchActiveReport = async () => {
    setLoading(true);
    try {
      if (activeReportTab === 'valuation') {
        const res = await reportsAPI.getValuation({ category: selectedCategory });
        if (res.data.success) setValuationData(res.data);
      } else if (activeReportTab === 'consumption') {
        const res = await reportsAPI.getConsumption();
        if (res.data.success) setConsumptionData(res.data.data);
      } else if (activeReportTab === 'waiting_jobs') {
        const res = await reportsAPI.getWaitingJobs();
        if (res.data.success) setWaitingJobsData(res.data.data);
      } else if (activeReportTab === 'spending') {
        const res = await reportsAPI.getSpending();
        if (res.data.success) setSpendingData(res.data);
      }
    } catch (err) {
      showToast('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveReport();
  }, [activeReportTab, selectedCategory]);

  // Export handlers
  const handleExportCSV = () => {
    if (activeReportTab === 'valuation' && valuationData?.items) {
      const csvData = valuationData.items.map((i) => ({
        SKU: i.sku,
        PartName: i.name,
        Category: i.category,
        Brand: i.brand,
        Supplier: i.supplierName,
        TotalUnits: i.totalQuantity,
        ReservedUnits: i.reservedQuantity,
        AvailableUnits: i.availableQuantity,
        CostPrice: i.purchasePrice,
        RetailPrice: i.sellingPrice,
        TotalCostValuation: i.costValue,
        TotalRetailValuation: i.retailValue,
        MarginPercent: `${i.marginPercent}%`,
      }));
      exportToCSV(csvData, `inventory_valuation_${Date.now()}.csv`);
      showToast('Inventory Valuation exported to CSV', 'success');
    } else if (activeReportTab === 'consumption' && consumptionData) {
      const csvData = consumptionData.map((c) => ({
        PartName: c.partName,
        SKU: c.sku,
        Category: c.category,
        TotalUnitsConsumed: c.totalQuantityIssued,
        TimesIssued: c.timesIssued,
        TotalCostConsumed: c.totalCostConsumed,
        TotalRetailBilled: c.totalRetailBilled,
      }));
      exportToCSV(csvData, `parts_consumption_${Date.now()}.csv`);
      showToast('Parts Consumption exported to CSV', 'success');
    } else if (activeReportTab === 'waiting_jobs' && waitingJobsData) {
      const csvData = waitingJobsData.map((j) => ({
        JobID: j.jobId,
        Customer: j.customerName,
        Phone: j.customerPhone,
        Vehicle: j.vehicle,
        RegistrationPlate: j.registrationNumber,
        Priority: j.priority,
        Technician: j.technicianName,
        DaysWaiting: j.daysWaiting,
        MissingPartsCount: j.missingPartsCount,
        MissingPartsList: j.missingParts.map((p) => `${p.needed}x ${p.partName}`).join('; '),
      }));
      exportToCSV(csvData, `delayed_jobs_report_${Date.now()}.csv`);
      showToast('Delayed Jobs report exported to CSV', 'success');
    } else if (activeReportTab === 'spending' && spendingData?.orders) {
      const csvData = spendingData.orders.map((o) => ({
        OrderNumber: o.requestNumber,
        Supplier: o.supplierName,
        TotalCost: o.totalEstimatedCost,
        Status: o.status,
        Date: o.createdAt,
      }));
      exportToCSV(csvData, `procurement_spending_${Date.now()}.csv`);
      showToast('Procurement Spending exported to CSV', 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Financial valuation, component consumption, bottleneck analysis & CSV data exports
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={handleExportCSV}
          icon={Download}
        >
          Export CSV
        </Button>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-1 text-xs font-semibold">
        {[
          { id: 'valuation', label: 'Inventory Valuation', icon: IndianRupee },
          { id: 'consumption', label: 'Parts Consumption', icon: TrendingUp },
          { id: 'waiting_jobs', label: 'Delayed Jobs Shortages', icon: Clock },
          { id: 'spending', label: 'Procurement Spending', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report 1: Valuation */}
      {activeReportTab === 'valuation' && (
        <div className="space-y-6">
          {valuationData && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Cost Valuation
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(valuationData.summary.totalCostValuation)}
                </div>
                <p className="mt-1 text-xs text-slate-500">Workshop asset value at cost</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Retail Value (Billing)
                </span>
                <div className="mt-2 text-2xl font-bold text-blue-600">
                  {formatCurrency(valuationData.summary.totalRetailValuation)}
                </div>
                <p className="mt-1 text-xs text-slate-500">Realizable billing value</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Potential Gross Profit
                </span>
                <div className="mt-2 text-2xl font-bold text-emerald-600">
                  {formatCurrency(valuationData.summary.potentialGrossProfit)}
                </div>
                <p className="mt-1 text-xs text-slate-500">Retail minus cost margin</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Units Tracked
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {valuationData.summary.totalStockUnits} Units
                </div>
                <p className="mt-1 text-xs text-slate-500">Across {valuationData.summary.totalPartsCount} unique SKUs</p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Inventory Valuation by Part</h3>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="p-6">
                <LoadingSkeleton rows={6} cols={6} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU & Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Total / Avail</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3 text-right">Retail Price</th>
                      <th className="py-2.5 px-3 text-right">Total Cost Value</th>
                      <th className="py-2.5 px-3 text-right">Retail Value</th>
                      <th className="py-2.5 px-3 text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {valuationData?.items?.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="font-mono text-[11px] text-blue-600">{item.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{item.category}</td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="font-bold text-slate-900">{item.totalQuantity}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="font-bold text-emerald-600">{item.availableQuantity}</span>
                        </td>
                        <td className="py-3 px-3 text-right">{formatCurrency(item.purchasePrice)}</td>
                        <td className="py-3 px-3 text-right font-medium">{formatCurrency(item.sellingPrice)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(item.costValue)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-blue-600">
                          {formatCurrency(item.retailValue)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.marginPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report 2: Parts Consumption */}
      {activeReportTab === 'consumption' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Spare Parts Consumption (Issued to Jobs)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of components installed into customer vehicles and billed out
            </p>
          </div>

          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={6} cols={5} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Part Name & SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Total Qty Consumed</th>
                    <th className="py-2.5 px-3 text-center">Times Issued</th>
                    <th className="py-2.5 px-3 text-right">Total Cost Value</th>
                    <th className="py-2.5 px-3 text-right">Total Retail Billed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consumptionData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{row.partName}</div>
                        <div className="font-mono text-[11px] text-blue-600">{row.sku}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{row.category}</td>
                      <td className="py-3 px-3 text-center font-bold text-sm text-slate-900 font-mono">
                        {row.totalQuantityIssued}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 font-mono">
                        {row.timesIssued} times
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {formatCurrency(row.totalCostConsumed)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        {formatCurrency(row.totalRetailBilled)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Report 3: Delayed Jobs */}
      {activeReportTab === 'waiting_jobs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Repair Jobs Delayed by Parts Shortage</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active workshop bottlenecks with customer contact and exact missing items
            </p>
          </div>

          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={6} cols={5} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Job ID & Priority</th>
                    <th className="py-2.5 px-3">Customer & Vehicle</th>
                    <th className="py-2.5 px-3">Technician</th>
                    <th className="py-2.5 px-3 text-center">Days Waiting</th>
                    <th className="py-2.5 px-3">Missing Components Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {waitingJobsData.map((job) => (
                    <tr key={job.jobId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">{job.jobId}</div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 mt-1">
                          {job.priority} Priority
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{job.customerName}</div>
                        <div className="text-[11px] text-slate-500">
                          {job.vehicle} • {job.registrationNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{job.technicianName}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                        {job.daysWaiting} days
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {job.missingParts.map((p, i) => (
                            <div key={i} className="text-[11px] text-rose-700 font-medium">
                              • Need {p.needed}x {p.partName} ({p.sku}) — Stock: {p.inStock}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Report 4: Procurement Spending */}
      {activeReportTab === 'spending' && spendingData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Procurement Spend
              </span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(spendingData.totalSpent)}
              </div>
              <p className="mt-1 text-xs text-slate-500">Across {spendingData.totalOrders} purchase orders</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Top Supplier Distribution
              </span>
              <div className="mt-2 space-y-1.5">
                {spendingData.spendBySupplier?.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{s.supplier}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Purchase Orders Register</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Order Number</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Order Date</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {spendingData.orders?.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.requestNumber}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{o.supplierName}</td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(o.createdAt)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(o.totalEstimatedCost)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
