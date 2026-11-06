import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  ShoppingCart,
  ArrowRight,
  Package,
  Wrench,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { inventoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency, formatDate } from '../utils/formatters';

export const Alerts = ({ onNavigate, onTriggerPO }) => {
  const { isManager } = useAuth();
  const { showToast } = useNotification();

  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.getAlerts();
      if (res.data.success) {
        setAlertData(res.data);
      }
    } catch (err) {
      showToast('Failed to load inventory alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading || !alertData) {
    return <LoadingSkeleton rows={6} cols={3} />;
  }

  const {
    outOfStockCount,
    lowStockCount,
    waitingJobsCount,
    outOfStockParts,
    lowStockParts,
    waitingJobs,
  } = alertData;

  const totalAlerts = outOfStockCount + lowStockCount + waitingJobsCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inventory Alert Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active stockout warnings, minimum threshold breaches & repair job shortages
          </p>
        </div>

        {isManager && (outOfStockParts.length > 0 || lowStockParts.length > 0) && (
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              const allCritical = [...outOfStockParts, ...lowStockParts];
              onTriggerPO({ items: allCritical });
            }}
            icon={ShoppingCart}
          >
            Create Bulk Restock PO
          </Button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Out of Stock Card */}
        <div
          onClick={() => setActiveFilter('out')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'out'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Critical Out of Stock
            </span>
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{outOfStockCount} SKUs</div>
          <p className="mt-1 text-xs text-slate-500">Zero available stock in workshop</p>
        </div>

        {/* Low Stock Card */}
        <div
          onClick={() => setActiveFilter('low')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'low'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Low Stock Warnings
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{lowStockCount} SKUs</div>
          <p className="mt-1 text-xs text-slate-500">Stock at or below minimum threshold</p>
        </div>

        {/* Waiting Jobs Card */}
        <div
          onClick={() => setActiveFilter('jobs')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'jobs'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Jobs Delayed by Parts
            </span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{waitingJobsCount} Jobs</div>
          <p className="mt-1 text-xs text-slate-500">Repair tickets waiting for components</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Alerts ({totalAlerts})
        </button>
        <button
          onClick={() => setActiveFilter('out')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            activeFilter === 'out'
              ? 'bg-rose-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Out of Stock ({outOfStockCount})
        </button>
        <button
          onClick={() => setActiveFilter('low')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            activeFilter === 'low'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Low Stock ({lowStockCount})
        </button>
        <button
          onClick={() => setActiveFilter('jobs')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            activeFilter === 'jobs'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Blocked Jobs ({waitingJobsCount})
        </button>
      </div>

      {/* Alerts Content */}
      <div className="space-y-6">
        {/* Section 1: Delayed Repair Jobs */}
        {(activeFilter === 'all' || activeFilter === 'jobs') && waitingJobs.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Repair Jobs Blocked by Missing Parts</h3>
                <p className="text-xs text-slate-500">
                  Technicians cannot proceed until these parts are received into inventory
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {waitingJobs.map((job) => (
                <div
                  key={job.jobId}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-sm text-slate-900">{job.jobId}</div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                        {job.priority} Priority
                      </span>
                    </div>

                    <div className="text-xs text-slate-800 font-semibold mt-1">
                      {job.customerName} ({job.registrationNumber})
                    </div>

                    {/* Shortages list */}
                    <div className="mt-2.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Missing Required Parts:
                      </span>
                      {job.shortages.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200/80"
                        >
                          <span className="font-medium text-slate-900">{s.partName}</span>
                          <span className="font-bold text-rose-600 font-mono">
                            Need {s.needed} (Stock: {s.availableInStock})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => onNavigate('jobs', job.jobId)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      View Job Details <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {isManager && (
                      <Button
                        variant="blue"
                        size="sm"
                        onClick={() =>
                          onTriggerPO({
                            job,
                            shortages: job.shortages.map((s) => ({
                              partId: s.partId,
                              partName: s.partName,
                              sku: s.sku,
                              shortage: s.needed,
                            })),
                          })
                        }
                        icon={ShoppingCart}
                      >
                        Order Missing Parts
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Out of Stock & Low Stock Items */}
        {(activeFilter === 'all' || activeFilter === 'out' || activeFilter === 'low') && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Inventory Reorder Alerts</h3>
                  <p className="text-xs text-slate-500">
                    Items needing replenishment to meet minimum workshop buffer standards
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3">Part Details</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3 text-center">Threshold</th>
                    <th className="py-2.5 px-3 text-center">Urgency</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ...(activeFilter === 'low' ? [] : outOfStockParts),
                    ...(activeFilter === 'out' ? [] : lowStockParts),
                  ].map((alert, idx) => {
                    const isOut = alert.type === 'OUT_OF_STOCK';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{alert.part.name}</div>
                          <div className="font-mono text-[11px] text-blue-600">{alert.part.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{alert.part.category}</td>
                        <td className="py-3 px-3 text-slate-700">{alert.part.supplier?.name || 'Supplier'}</td>
                        <td className="py-3 px-3 text-center font-bold font-mono">
                          <span className={isOut ? 'text-rose-600' : 'text-amber-600'}>
                            {alert.available}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {alert.part.minimumStockLevel}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isOut
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {alert.urgency}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isManager && (
                            <Button
                              variant="blue"
                              size="sm"
                              onClick={() =>
                                onTriggerPO({
                                  supplierId: alert.part.supplier?._id,
                                  items: [alert],
                                })
                              }
                              icon={ShoppingCart}
                            >
                              Order
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
