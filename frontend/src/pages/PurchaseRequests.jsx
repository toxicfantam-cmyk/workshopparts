import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Check,
  Truck,
  ArrowDownLeft,
  Eye,
  AlertTriangle,
  Clock,
  Package,
  Calendar,
  X,
} from 'lucide-react';
import { purchaseRequestsAPI, suppliersAPI, partsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { formatCurrency, formatDate, getPRStatusConfig, getPriorityBadgeConfig } from '../utils/formatters';

export const PurchaseRequests = ({ initialCreateData, onClearInitialCreate }) => {
  const { user, isManager, isAdmin } = useAuth();
  const { showToast } = useNotification();

  // State
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [partsList, setPartsList] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPRToReceive, setSelectedPRToReceive] = useState(null);
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [deliveryNote, setDeliveryNote] = useState('');
  const [viewPRModalOpen, setViewPRModalOpen] = useState(false);
  const [selectedPRDetail, setSelectedPRDetail] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    supplierId: '',
    priority: 'Medium',
    reason: '',
    linkedRepairJobId: '',
    linkedJobId: '',
    items: [],
  });

  // Load suppliers and parts
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [supRes, partsRes] = await Promise.all([
          suppliersAPI.getSuppliers(),
          partsAPI.getParts({ limit: 100 }),
        ]);
        if (supRes.data.success) setSuppliers(supRes.data.suppliers);
        if (partsRes.data.success) setPartsList(partsRes.data.data);
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    };
    fetchMeta();
  }, []);

  const fetchRequests = async (page = 1) => {
    setLoading(true);
    try {
      const res = await purchaseRequestsAPI.getRequests({
        page,
        limit: 10,
        status: statusFilter,
        supplierId: supplierFilter,
        search,
      });
      if (res.data.success) {
        setRequests(res.data.data);
        setPagination(res.data.pagination);
        setCurrentPage(page);
      }
    } catch (err) {
      showToast('Failed to load purchase requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
  }, [statusFilter, supplierFilter, search]);

  // Handle triggered initial create data (e.g. from RepairJob shortage or Low-stock alert)
  useEffect(() => {
    if (initialCreateData) {
      const { job, shortages, supplierId, items } = initialCreateData;
      if (job && shortages) {
        const defaultSupplier = shortages[0]?.supplier || suppliers[0]?._id;
        setFormData({
          supplierId: defaultSupplier || '',
          priority: job.priority === 'Urgent' ? 'Urgent' : 'High',
          reason: `Shortage replenishment for Job ${job.jobId} (${job.customerName})`,
          linkedRepairJobId: job._id,
          linkedJobId: job.jobId,
          items: shortages.map((s) => ({
            partId: s.partId,
            name: s.partName,
            sku: s.sku,
            quantity: s.shortage || 1,
            unitPrice: s.purchasePrice || 1000,
          })),
        });
      } else if (items) {
        setFormData({
          supplierId: supplierId || suppliers[0]?._id || '',
          priority: 'High',
          reason: 'Restocking low and out-of-stock items',
          linkedRepairJobId: '',
          linkedJobId: '',
          items: items.map((it) => ({
            partId: it.part._id,
            name: it.part.name,
            sku: it.part.sku,
            quantity: it.shortageNeeded || 5,
            unitPrice: it.part.purchasePrice,
          })),
        });
      }
      setCreateModalOpen(true);
      if (onClearInitialCreate) onClearInitialCreate();
    }
  }, [initialCreateData]);

  const handleOpenCreateModal = () => {
    setFormData({
      supplierId: suppliers[0]?._id || '',
      priority: 'Medium',
      reason: 'General inventory replenishment',
      linkedRepairJobId: '',
      linkedJobId: '',
      items: [],
    });
    setCreateModalOpen(true);
  };

  const handleAddItemToPR = (partId) => {
    if (!partId) return;
    const part = partsList.find((p) => p._id === partId);
    if (!part) return;

    if (formData.items.some((i) => i.partId === partId)) {
      showToast('Item already added to this purchase request', 'warning');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          partId: part._id,
          name: part.name,
          sku: part.sku,
          quantity: 5,
          unitPrice: part.purchasePrice,
        },
      ],
    }));
  };

  const handleUpdateItemQty = (partId, qty) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.partId === partId ? { ...i, quantity: Math.max(1, Number(qty) || 1) } : i
      ),
    }));
  };

  const handleRemoveItem = (partId) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.partId !== partId),
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) {
      showToast('Please select a supplier', 'warning');
      return;
    }
    if (formData.items.length === 0) {
      showToast('Please add at least one spare part item', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId: formData.supplierId,
        priority: formData.priority,
        reason: formData.reason,
        linkedRepairJobId: formData.linkedRepairJobId || null,
        items: formData.items.map((it) => ({
          partId: it.partId,
          quantityRequested: Number(it.quantity),
          estimatedUnitPrice: Number(it.unitPrice),
        })),
      };

      const res = await purchaseRequestsAPI.createRequest(payload);
      if (res.data.success) {
        showToast(`Purchase Request ${res.data.purchaseRequest.requestNumber} created!`, 'success');
        setCreateModalOpen(false);
        fetchRequests(1);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create PR', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Status transitions: Approve, Mark Ordered
  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await purchaseRequestsAPI.updateStatus(id, { status });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchRequests(currentPage);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // Open Receive Stock Modal
  const handleOpenReceiveModal = (pr) => {
    setSelectedPRToReceive(pr);
    const initialQtys = {};
    pr.items.forEach((item) => {
      const remaining = Math.max(0, item.quantityRequested - (item.quantityReceived || 0));
      initialQtys[item.part?._id || item.part] = remaining; // default to remaining
    });
    setReceivedQuantities(initialQtys);
    setDeliveryNote('');
    setReceiveModalOpen(true);
  };

  const handleReceiveStockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPRToReceive) return;

    setSubmitting(true);
    try {
      const receivedItems = Object.entries(receivedQuantities).map(([partId, qty]) => ({
        partId,
        quantityReceived: Number(qty) || 0,
      }));

      const res = await purchaseRequestsAPI.receiveStock(selectedPRToReceive._id, {
        receivedItems,
        deliveryNoteNumber: deliveryNote,
      });

      if (res.data.success) {
        let msg = res.data.message;
        if (res.data.promotedJobs && res.data.promotedJobs.length > 0) {
          msg += ` • ${res.data.promotedJobs.length} waiting job(s) (${res.data.promotedJobs.map((j) => j.jobId).join(', ')}) satisfied and promoted to In Progress!`;
        }
        showToast(msg, 'success', 7000);
        setReceiveModalOpen(false);
        fetchRequests(currentPage);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to receive stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Purchase Requests & Orders</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage procurement workflows, supplier purchase orders & automated inventory stock receipt
          </p>
        </div>

        {isManager && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            icon={Plus}
          >
            Create Purchase Request
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        {/* Status quick tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'Pending Approval', label: 'Pending Approval' },
            { id: 'Approved', label: 'Approved' },
            { id: 'Ordered', label: 'Ordered' },
            { id: 'Partially Received', label: 'Partially Received' },
            { id: 'Received', label: 'Received' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PO number, supplier name or reason..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
            />
          </div>

          <div>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={8} cols={6} />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="No purchase requests found"
            description="No orders match your filter criteria."
            actionLabel={isManager ? 'Create Purchase Request' : null}
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">PO Number & Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Linked Job / Reason</th>
                  <th className="py-3 px-4 text-right">Estimated Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((pr) => {
                  const statusCfg = getPRStatusConfig(pr.status);
                  const priorityCfg = getPriorityBadgeConfig(pr.priority);
                  const canReceive = pr.status === 'Ordered' || pr.status === 'Partially Received' || pr.status === 'Approved';

                  return (
                    <tr key={pr._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* PO Number & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm font-mono">{pr.requestNumber}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(pr.createdAt)}</div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{pr.supplierName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {pr.supplier?.phone || pr.supplier?.supplierId || 'Supplier'}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {pr.items?.length || 0} part SKU(s)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                          {pr.items?.map((it) => `${it.quantityRequested}x ${it.partName}`).join(', ')}
                        </div>
                      </td>

                      {/* Linked Job / Reason */}
                      <td className="py-3.5 px-4">
                        {pr.linkedJobId ? (
                          <div className="inline-flex items-center gap-1 font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            Job: {pr.linkedJobId}
                          </div>
                        ) : null}
                        <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">
                          {pr.reason}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatCurrency(pr.totalEstimatedCost)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Action */}
                          {isAdmin && pr.status === 'Pending Approval' && (
                            <Button
                              variant="blue"
                              size="sm"
                              onClick={() => handleUpdateStatus(pr._id, 'Approved')}
                              icon={Check}
                            >
                              Approve
                            </Button>
                          )}

                          {/* Mark Ordered Action */}
                          {isManager && pr.status === 'Approved' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleUpdateStatus(pr._id, 'Ordered')}
                              icon={Truck}
                            >
                              Mark Ordered
                            </Button>
                          )}

                          {/* Receive Stock Action */}
                          {isManager && canReceive && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleOpenReceiveModal(pr)}
                              icon={ArrowDownLeft}
                            >
                              Receive Stock
                            </Button>
                          )}

                          {/* View details */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedPRDetail(pr);
                              setViewPRModalOpen(true);
                            }}
                            icon={Eye}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination pagination={pagination} onPageChange={(p) => fetchRequests(p)} />
      </div>

      {/* Create Purchase Request Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Purchase Request"
        subtitle="Request component orders from suppliers to replenish stock or satisfy job shortages."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Supplier *
              </label>
              <select
                required
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.supplierId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Reason / Justification
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Replenishing ceramic brake pads or Job shortage"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Add Item Row */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Add Spare Parts to Order
            </label>
            <select
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 mb-3"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddItemToPR(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="" disabled>
                + Select part to add to this order...
              </option>
              {partsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku}) — Cost: {formatCurrency(p.purchasePrice)}
                </option>
              ))}
            </select>

            {/* Selected Items */}
            {formData.items.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No parts selected for order. Select a part from above.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.items.map((item) => (
                  <div
                    key={item.partId}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {item.sku} • Est. Unit: {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-slate-500">Order Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemQty(item.partId, e.target.value)}
                          className="w-16 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-center font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.partId)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit Purchase Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receive Stock Modal (Step 7, 8, 9, 10 Workflow) */}
      {selectedPRToReceive && (
        <Modal
          isOpen={receiveModalOpen}
          onClose={() => setReceiveModalOpen(false)}
          title={`Receive Stock — ${selectedPRToReceive.requestNumber}`}
          subtitle="Log received quantities. Inventory automatically updates and fulfills waiting repair jobs."
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleReceiveStockSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900">
              <span className="font-bold">Workflow Automation:</span> When you record received quantities, the system automatically checks waiting repair jobs that need these parts, reserves the incoming units, and transitions jobs to "In Progress".
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Supplier Delivery Challan / Invoice #
              </label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="e.g. DN-BOSCH-89218"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Items Being Received
              </label>
              <div className="space-y-3">
                {selectedPRToReceive.items.map((item) => {
                  const partId = item.part?._id || item.part;
                  const alreadyReceived = item.quantityReceived || 0;
                  const remainingNeeded = Math.max(0, item.quantityRequested - alreadyReceived);

                  return (
                    <div
                      key={partId}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{item.partName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.sku} • Requested: {item.quantityRequested} • Received: {alreadyReceived} • Remaining: {remainingNeeded}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-slate-600 font-semibold">Qty Receiving:</label>
                        <input
                          type="number"
                          min="0"
                          max={remainingNeeded + 50}
                          value={receivedQuantities[partId] || 0}
                          onChange={(e) =>
                            setReceivedQuantities({
                              ...receivedQuantities,
                              [partId]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-16 px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setReceiveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success" loading={submitting}>
                Confirm & Stock into Inventory
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View PR Details Modal */}
      {selectedPRDetail && (
        <Modal
          isOpen={viewPRModalOpen}
          onClose={() => setViewPRModalOpen(false)}
          title={`Purchase Request ${selectedPRDetail.requestNumber}`}
          subtitle={`Supplier: ${selectedPRDetail.supplierName} • Status: ${selectedPRDetail.status}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Total Cost</span>
                <div className="text-base font-bold text-slate-900">
                  {formatCurrency(selectedPRDetail.totalEstimatedCost)}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Priority</span>
                <div className="text-base font-bold text-slate-900">{selectedPRDetail.priority}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Order Items</h4>
              <div className="space-y-2 border border-slate-200 rounded-xl p-3">
                {selectedPRDetail.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b last:border-0 border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900">{it.partName}</span>
                      <span className="text-slate-400 ml-2 font-mono">({it.sku})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">
                        {it.quantityReceived || 0} / {it.quantityRequested} received
                      </span>
                      <div className="text-[11px] text-slate-500">
                        {formatCurrency(it.estimatedUnitPrice)} / unit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedPRDetail.reason && (
              <div>
                <span className="font-semibold text-slate-700">Reason / Notes:</span>
                <p className="mt-1 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedPRDetail.reason}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
