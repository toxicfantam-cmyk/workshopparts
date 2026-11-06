import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  Filter,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { inventoryAPI, partsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Pagination } from '../components/common/Pagination';
import { formatDate, formatDateTime } from '../utils/formatters';

export const Inventory = ({ onNavigate }) => {
  const { isManager } = useAuth();
  const { showToast } = useNotification();

  // State
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState([]);

  // Filters
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPart, setSelectedPart] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [adjustForm, setAdjustForm] = useState({
    partId: '',
    adjustmentType: 'INCREASE',
    quantity: '1',
    reason: 'Cycle Count Audit Variance',
    notes: '',
  });

  const [receiveForm, setReceiveForm] = useState({
    partId: '',
    quantity: '5',
    referenceNumber: '',
    notes: '',
  });

  // Load parts list for dropdowns
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const res = await partsAPI.getParts({ limit: 100 });
        if (res.data.success) {
          setParts(res.data.data);
          if (res.data.data.length > 0) {
            setAdjustForm((prev) => ({ ...prev, partId: res.data.data[0]._id }));
            setReceiveForm((prev) => ({ ...prev, partId: res.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.error('Failed to load parts list:', err);
      }
    };
    fetchParts();
  }, []);

  const fetchMovements = async (page = 1) => {
    setLoading(true);
    try {
      const res = await inventoryAPI.getMovements({
        page,
        limit: 15,
        type: selectedType,
        partId: selectedPart,
      });
      if (res.data.success) {
        setMovements(res.data.data);
        setPagination(res.data.pagination);
        setCurrentPage(page);
      }
    } catch (err) {
      showToast('Failed to load stock movements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements(1);
  }, [selectedType, selectedPart]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await inventoryAPI.adjustStock({
        partId: adjustForm.partId,
        adjustmentType: adjustForm.adjustmentType,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason,
        notes: adjustForm.notes,
      });
      if (res.data.success) {
        showToast(res.data.message || 'Stock adjusted successfully', 'success');
        setAdjustModalOpen(false);
        fetchMovements(currentPage);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to adjust stock';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await inventoryAPI.receiveManual({
        partId: receiveForm.partId,
        quantity: Number(receiveForm.quantity),
        referenceNumber: receiveForm.referenceNumber,
        notes: receiveForm.notes,
      });
      if (res.data.success) {
        let msg = res.data.message;
        if (res.data.fulfilledJobs?.length > 0) {
          msg += ` • ${res.data.fulfilledJobs.length} waiting job(s) promoted to In Progress!`;
        }
        showToast(msg, 'success', 6000);
        setReceiveModalOpen(false);
        fetchMovements(currentPage);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to receive stock';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'RECEIVED':
        return <Badge variant="bg-emerald-50 text-emerald-700 border-emerald-200">RECEIVED</Badge>;
      case 'ISSUED':
        return <Badge variant="bg-blue-50 text-blue-700 border-blue-200">ISSUED</Badge>;
      case 'RESERVED':
        return <Badge variant="bg-amber-50 text-amber-700 border-amber-200">RESERVED</Badge>;
      case 'RELEASED':
        return <Badge variant="bg-purple-50 text-purple-700 border-purple-200">RELEASED</Badge>;
      case 'ADJUSTMENT_INCREASE':
        return <Badge variant="bg-teal-50 text-teal-700 border-teal-200">+ADJUSTMENT</Badge>;
      case 'ADJUSTMENT_DECREASE':
        return <Badge variant="bg-rose-50 text-rose-700 border-rose-200">-ADJUSTMENT</Badge>;
      default:
        return <Badge variant="bg-slate-100 text-slate-700 border-slate-200">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inventory Management & Audit Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit record of all physical stock receipts, job reservations, issuances & cycle count adjustments
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setAdjustModalOpen(true)}
              icon={Sliders}
            >
              Adjust Stock
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setReceiveModalOpen(true)}
              icon={ArrowDownLeft}
            >
              Direct Stock Receipt
            </Button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:w-64">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
          >
            <option value="all">All Movement Types</option>
            <option value="RECEIVED">Stock Received</option>
            <option value="ISSUED">Stock Issued (Consumed)</option>
            <option value="RESERVED">Stock Reserved for Jobs</option>
            <option value="RELEASED">Stock Released (Cancelled Jobs)</option>
            <option value="ADJUSTMENT_INCREASE">Adjustments (Increase)</option>
            <option value="ADJUSTMENT_DECREASE">Adjustments (Decrease)</option>
          </select>
        </div>

        <div className="w-full sm:w-72">
          <select
            value={selectedPart}
            onChange={(e) => setSelectedPart(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
          >
            <option value="all">All Spare Parts</option>
            {parts.map((p) => (
              <option key={p._id} value={p._id}>
                {p.sku} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={8} cols={6} />
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            title="No inventory movements recorded"
            description="There are no stock movements matching your filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Movement ID & Date</th>
                  <th className="py-3 px-4">Part Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-center">Stock Before → After</th>
                  <th className="py-3 px-4">Reference & Reason</th>
                  <th className="py-3 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((mov) => {
                  const isPositive =
                    mov.type === 'RECEIVED' || mov.type === 'ADJUSTMENT_INCREASE';
                  const isNegative =
                    mov.type === 'ISSUED' || mov.type === 'ADJUSTMENT_DECREASE';

                  return (
                    <tr key={mov._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Movement ID & Timestamp */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">{mov.movementId}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{formatDateTime(mov.createdAt)}</div>
                      </td>

                      {/* Part Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{mov.partName}</div>
                        <div className="font-mono text-[11px] text-blue-600">{mov.sku}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">{getTypeBadge(mov.type)}</td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isPositive
                              ? 'text-emerald-600'
                              : isNegative
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {isPositive ? `+${mov.quantity}` : isNegative ? `-${mov.quantity}` : mov.quantity}
                        </span>
                      </td>

                      {/* Previous vs New Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80">
                          <span>{mov.previousTotal}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-slate-900">{mov.newTotal}</span>
                          <span className="text-[10px] text-slate-400">
                            (Rsv: {mov.newReserved})
                          </span>
                        </div>
                      </td>

                      {/* Reference & Reason */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {mov.referenceType}: <span className="font-mono text-blue-600">{mov.referenceId || 'N/A'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">
                          {mov.reason || '—'}
                        </div>
                      </td>

                      {/* Performed by */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 text-xs">{mov.performedByName}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination pagination={pagination} onPageChange={(p) => fetchMovements(p)} />
      </div>

      {/* Modal: Manual Stock Adjustment */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Manual Stock Adjustment"
        subtitle="Record inventory count adjustments for audit tracking. Never results in negative stock."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Select Spare Part *
            </label>
            <select
              required
              value={adjustForm.partId}
              onChange={(e) => setAdjustForm({ ...adjustForm, partId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {parts.map((p) => {
                const avail = (p.totalQuantity || 0) - (p.reservedQuantity || 0);
                return (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku}) — Avail: {avail} (Total: {p.totalQuantity}, Rsvd: {p.reservedQuantity})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Adjustment Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustForm({ ...adjustForm, adjustmentType: 'INCREASE' })}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  adjustForm.adjustmentType === 'INCREASE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                + Increase Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustForm({ ...adjustForm, adjustmentType: 'DECREASE' })}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  adjustForm.adjustmentType === 'DECREASE'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                - Decrease Stock
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Quantity to Adjust *
            </label>
            <input
              type="number"
              required
              min="1"
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Reason / Category *
            </label>
            <select
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="Cycle Count Audit Variance">Cycle Count Audit Variance</option>
              <option value="Damaged Stock Write-off">Damaged Stock Write-off</option>
              <option value="Supplier Return">Supplier Return</option>
              <option value="Found Unrecorded Stock">Found Unrecorded Stock</option>
              <option value="Initial Physical Audit Adjustment">Initial Physical Audit Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Audit Notes
            </label>
            <textarea
              rows="2"
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
              placeholder="e.g. Audit conducted on Rack B..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Direct Manual Stock Receipt */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title="Direct Stock Intake"
        subtitle="Log received parts into inventory and automatically trigger reservation for waiting repair jobs."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Select Spare Part *
            </label>
            <select
              required
              value={receiveForm.partId}
              onChange={(e) => setReceiveForm({ ...receiveForm, partId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {parts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku}) — Current: {p.totalQuantity}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Quantity Received *
            </label>
            <input
              type="number"
              required
              min="1"
              value={receiveForm.quantity}
              onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Delivery Challan / Invoice Reference
            </label>
            <input
              type="text"
              value={receiveForm.referenceNumber}
              onChange={(e) => setReceiveForm({ ...receiveForm, referenceNumber: e.target.value })}
              placeholder="e.g. DC-2025-998"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Notes
            </label>
            <textarea
              rows="2"
              value={receiveForm.notes}
              onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
              placeholder="e.g. Direct supplier express intake..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setReceiveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Receive into Inventory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
