import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Car,
  ShoppingCart,
  RotateCcw,
  Check,
  Ban,
  Package,
  Calendar,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { repairJobsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency, formatDate, formatDateTime, getJobStatusConfig, getPriorityBadgeConfig } from '../utils/formatters';

export const RepairJobDetail = ({ jobId, onBack, onGeneratePO }) => {
  const { user, isManager, isTechnician } = useAuth();
  const { showToast } = useNotification();

  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Confirmation dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const fetchJobDetail = async () => {
    setLoading(true);
    try {
      const res = await repairJobsAPI.getJobById(jobId);
      if (res.data.success) {
        setJobData(res.data);
      }
    } catch (err) {
      showToast('Failed to load repair job details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetail();
    }
  }, [jobId]);

  if (loading || !jobData) {
    return <LoadingSkeleton rows={6} cols={3} />;
  }

  const { job, stockAnalysis, hasShortage } = jobData;
  const statusCfg = getJobStatusConfig(job.status);
  const priorityCfg = getPriorityBadgeConfig(job.priority);

  // Handle Recheck and Reserve
  const handleRecheckAndReserve = async () => {
    setActionLoading(true);
    try {
      const res = await repairJobsAPI.recheckAndReserve(job._id);
      if (res.data.success) {
        showToast(res.data.message, res.data.isFullyReserved ? 'success' : 'warning');
        fetchJobDetail();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error checking reservations', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Update
  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      const res = await repairJobsAPI.updateJob(job._id, { status: newStatus });
      if (res.data.success) {
        showToast(`Job status updated to ${newStatus}`, 'success');
        fetchJobDetail();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update job status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel Job
  const handleCancelJob = async () => {
    setActionLoading(true);
    try {
      const res = await repairJobsAPI.cancelJob(job._id);
      if (res.data.success) {
        showToast('Job cancelled and reserved parts released to inventory', 'info');
        setCancelDialogOpen(false);
        fetchJobDetail();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel job', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Complete Job
  const handleCompleteJob = async () => {
    setActionLoading(true);
    try {
      const res = await repairJobsAPI.updateJob(job._id, { status: 'Completed' });
      if (res.data.success) {
        showToast('Job completed! Parts issued and consumed permanently from inventory.', 'success');
        setCompleteDialogOpen(false);
        fetchJobDetail();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete job', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} icon={ArrowLeft}>
            Back to Jobs
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 font-mono">{job.jobId}</h2>
              <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityCfg.color}`}>
                {job.priority} Priority
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {formatDate(job.createdAt)} • Expected delivery:{' '}
              {formatDate(job.expectedCompletionDate)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchJobDetail}
            icon={RefreshCw}
            disabled={actionLoading}
          >
            Refresh
          </Button>

          {/* Re-check inventory reservations */}
          {isManager && job.status !== 'Completed' && job.status !== 'Cancelled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecheckAndReserve}
              loading={actionLoading}
              icon={RotateCcw}
            >
              Check & Reserve Stock
            </Button>
          )}

          {/* Technician / Manager status transitions */}
          {job.status === 'New' && (
            <Button
              variant="blue"
              size="sm"
              onClick={() => handleStatusChange('Inspection')}
              loading={actionLoading}
            >
              Start Inspection
            </Button>
          )}

          {job.status === 'Inspection' && (
            <Button
              variant="blue"
              size="sm"
              onClick={() => handleStatusChange('In Progress')}
              loading={actionLoading}
            >
              Mark In Progress
            </Button>
          )}

          {job.status === 'In Progress' && (
            <Button
              variant="blue"
              size="sm"
              onClick={() => handleStatusChange('Ready for Delivery')}
              loading={actionLoading}
            >
              Ready for Delivery
            </Button>
          )}

          {job.status === 'Ready for Delivery' && (
            <Button
              variant="success"
              size="sm"
              onClick={() => setCompleteDialogOpen(true)}
              loading={actionLoading}
              icon={Check}
            >
              Complete & Issue Parts
            </Button>
          )}

          {/* Cancel button */}
          {isManager && job.status !== 'Completed' && job.status !== 'Cancelled' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
              loading={actionLoading}
              icon={Ban}
            >
              Cancel Job
            </Button>
          )}
        </div>
      </div>

      {/* Shortage Warning Banner (If Waiting for Parts) */}
      {job.status === 'Waiting for Parts' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">This job is delayed because required spare parts are unavailable</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Review the shortages below. You can generate a purchase order directly to replenish the exact missing quantities.
              </p>
            </div>
          </div>

          {isManager && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onGeneratePO(job, stockAnalysis.filter((s) => s.shortage > 0))}
              icon={ShoppingCart}
              className="shrink-0 shadow-sm"
            >
              Generate Purchase Request
            </Button>
          )}
        </div>
      )}

      {/* Grid: Job Details & Parts Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Customer & Vehicle Info) */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Information</h3>
            <div>
              <div className="text-base font-bold text-slate-900">{job.customerName}</div>
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.customerPhone}</span>
              </div>
              {job.customerEmail && (
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{job.customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Vehicle / Equipment</h3>
            <div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                <span>
                  {job.vehicleDetails?.make} {job.vehicleDetails?.model}
                </span>
              </div>
              <div className="mt-2 inline-block font-mono font-bold text-xs bg-slate-100 text-blue-700 px-2.5 py-1 rounded-lg border border-slate-200">
                {job.registrationNumber}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Model Year: <span className="font-semibold text-slate-700">{job.vehicleDetails?.year}</span>
              </div>
            </div>
          </div>

          {/* Technician & Financials Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Assignment & Estimates</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Technician:</span>
                <span className="font-semibold text-slate-800">{job.technicianName || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Parts Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(job.totalPartsCost)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Labor Estimate:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(job.estimatedLaborCost)}</span>
              </div>
              <div className="flex items-center justify-between py-1 pt-2 font-bold text-sm text-slate-900">
                <span>Total Estimate:</span>
                <span className="text-blue-600 font-bold">{formatCurrency(job.totalEstimatedCost)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (2 cols): Required Parts & Shortages Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Required Spare Parts & Availability</h3>
                <p className="text-xs text-slate-500">
                  Exact stock check for each component needed for this repair ticket
                </p>
              </div>

              {isManager && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecheckAndReserve}
                  icon={RotateCcw}
                >
                  Re-evaluate
                </Button>
              )}
            </div>

            {/* Parts Shortage Analysis Table */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3">Part Name & SKU</th>
                    <th className="py-2.5 px-3 text-center">Required</th>
                    <th className="py-2.5 px-3 text-center">Reserved</th>
                    <th className="py-2.5 px-3 text-center">Available in Stock</th>
                    <th className="py-2.5 px-3 text-center">Shortage</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockAnalysis.map((item) => {
                    const hasMissing = item.shortage > 0;
                    return (
                      <tr
                        key={item.partId}
                        className={hasMissing ? 'bg-rose-50/40' : 'hover:bg-slate-50/50'}
                      >
                        {/* Part Info */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.partName}</div>
                          <div className="font-mono text-[11px] text-blue-600">{item.sku}</div>
                          {item.storageLocation && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Bin: {item.storageLocation.rack} • {item.storageLocation.bin}
                            </div>
                          )}
                        </td>

                        {/* Quantity Required */}
                        <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                          {item.quantityRequired}
                        </td>

                        {/* Quantity Reserved */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono font-semibold px-2 py-0.5 rounded-full ${
                              item.isFulfilled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.quantityReserved}
                          </span>
                        </td>

                        {/* Available in Stock */}
                        <td className="py-3 px-3 text-center font-mono text-slate-700">
                          {item.availableInStock}
                        </td>

                        {/* Shortage */}
                        <td className="py-3 px-3 text-center">
                          {hasMissing ? (
                            <span className="font-mono font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
                              -{item.shortage} Missing
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">None</span>
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-3 text-right font-medium text-slate-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Job Description & Notes */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description of Work & Customer Notes
              </h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                {job.description}
              </p>
              {job.notes && (
                <p className="text-xs text-slate-600 italic mt-2">
                  <span className="font-semibold text-slate-700">Technician notes:</span> {job.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelJob}
        title="Cancel Repair Job"
        message={`Are you sure you want to cancel ${job.jobId}? All ${job.requiredParts?.reduce(
          (sum, p) => sum + (p.quantityReserved || 0),
          0
        )} reserved parts will be immediately released back to available inventory.`}
        confirmText="Cancel Job & Release Parts"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        onConfirm={handleCompleteJob}
        title="Complete Repair Job & Issue Parts"
        message={`Mark ${job.jobId} as Completed? This will permanently deduct the reserved parts from workshop inventory and record auditable ISSUED stock movements.`}
        confirmText="Complete & Issue Stock"
        confirmVariant="success"
        loading={actionLoading}
      />
    </div>
  );
};
