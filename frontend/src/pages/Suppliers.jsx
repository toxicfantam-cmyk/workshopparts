import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Eye,
  Edit2,
  Trash2,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { suppliersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency, formatDate } from '../utils/formatters';

export const Suppliers = ({ onSelectSupplier }) => {
  const { isManager, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    street: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    categories: '',
    rating: 4.5,
    paymentTerms: 'Net 30',
    notes: '',
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await suppliersAPI.getSuppliers({ search });
      if (res.data.success) {
        setSuppliers(res.data.suppliers);
      }
    } catch (err) {
      showToast('Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      street: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      categories: 'Brakes, Electrical, Engine',
      rating: 4.5,
      paymentTerms: 'Net 30',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      street: sup.address?.street || '',
      city: sup.address?.city || 'Mumbai',
      state: sup.address?.state || 'Maharashtra',
      postalCode: sup.address?.postalCode || '',
      categories: Array.isArray(sup.categories) ? sup.categories.join(', ') : '',
      rating: sup.rating || 4.5,
      paymentTerms: sup.paymentTerms || 'Net 30',
      notes: sup.notes || '',
    });
    setModalOpen(true);
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await suppliersAPI.getSupplierById(id);
      if (res.data.success) {
        setSelectedSupplierDetail(res.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to load supplier details', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Supplier company name is required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
        },
        categories: formData.categories,
        rating: Number(formData.rating) || 4.5,
        paymentTerms: formData.paymentTerms,
        notes: formData.notes,
      };

      if (editingSupplier) {
        await suppliersAPI.updateSupplier(editingSupplier._id, payload);
        showToast('Supplier updated successfully', 'success');
      } else {
        await suppliersAPI.createSupplier(payload);
        showToast('Supplier added successfully', 'success');
      }

      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;
    setSubmitting(true);
    try {
      await suppliersAPI.deleteSupplier(supplierToDelete._id);
      showToast(`Supplier ${supplierToDelete.name} deleted`, 'success');
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Supplier Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authorized automotive parts distributors, rating metrics & purchase order history
          </p>
        </div>

        {isManager && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            icon={Plus}
          >
            Add Supplier
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by supplier company, contact person or city..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <LoadingSkeleton rows={4} cols={3} />
      ) : suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers found"
          description="Try modifying your search criteria or add a new supplier."
          actionLabel={isManager ? 'Add Supplier' : null}
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup._id}
              onClick={() => handleViewDetails(sup._id)}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {sup.supplierId}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{sup.rating || 4.5}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
                  {sup.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Contact: {sup.contactPerson || '—'}</p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {sup.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {sup.address?.city || 'India'}
                      {sup.address?.state ? `, ${sup.address.state}` : ''}
                    </span>
                  </div>
                </div>

                {/* Categories */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {sup.categories?.map((cat, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Metrics & Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{sup.partsCount || 0} Parts</span>
                  <span>•</span>
                  <span>{sup.activeOrdersCount || 0} Open POs</span>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {isManager && (
                    <button
                      onClick={() => handleOpenEditModal(sup)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSupplierToDelete(sup);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Detail Modal */}
      {selectedSupplierDetail && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={selectedSupplierDetail.supplier.name}
          subtitle={`Supplier ID: ${selectedSupplierDetail.supplier.supplierId} • City: ${selectedSupplierDetail.supplier.address?.city}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Overview Stats */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Parts Supplied</span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedSupplierDetail.stats.totalParts} SKUs
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Orders</span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedSupplierDetail.stats.totalOrders} Orders
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Spend</span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {formatCurrency(selectedSupplierDetail.stats.totalOrdersValue)}
                </div>
              </div>
            </div>

            {/* Supplied Parts List */}
            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-500 mb-2">
                Supplied Spare Parts Catalogue
              </h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {selectedSupplierDetail.parts.map((part) => (
                  <div key={part._id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{part.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {part.sku} • {part.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">{formatCurrency(part.purchasePrice)}</div>
                      <div className="text-[10px] text-slate-500">In Stock: {part.totalQuantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase History */}
            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-500 mb-2">
                Purchase History
              </h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {selectedSupplierDetail.purchaseOrders.map((po) => (
                  <div key={po._id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-blue-600">{po.requestNumber}</span>
                      <span className="text-slate-400 ml-2">{formatDate(po.createdAt)}</span>
                      <div className="text-[11px] text-slate-600 mt-0.5">{po.reason || 'Restocking'}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{formatCurrency(po.totalEstimatedCost)}</span>
                      <div className="text-[10px] font-semibold text-slate-600">{po.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        subtitle="Manage company contact, payment terms & supplied categories"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Bosch Auto Aftermarket"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Kailash Soni"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98200 12345"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="supplier@company.com"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Mumbai"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Maharashtra"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Supplied Categories (comma separated)
            </label>
            <input
              type="text"
              value={formData.categories}
              onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
              placeholder="e.g. Brakes, Electrical, Filters"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingSupplier ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier"
        message={`Are you sure you want to delete ${supplierToDelete?.name}?`}
        confirmText="Delete Supplier"
        loading={submitting}
      />
    </div>
  );
};
