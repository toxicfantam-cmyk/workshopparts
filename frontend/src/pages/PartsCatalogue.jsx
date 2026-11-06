import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  MapPin,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { partsAPI, suppliersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { formatCurrency, formatDate, getStockStatusConfig } from '../utils/formatters';

export const PartsCatalogue = ({ initialPartId, onQuickAction }) => {
  const { isManager, isAdmin } = useAuth();
  const { showToast } = useNotification();

  // Parts list state
  const [parts, setParts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPartDetail, setSelectedPartDetail] = useState(null);
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Brakes',
    description: '',
    brand: '',
    compatibleVehicles: '',
    supplier: '',
    purchasePrice: '',
    sellingPrice: '',
    totalQuantity: '0',
    minimumStockLevel: '5',
    storageRack: 'Rack A',
    storageShelf: 'Shelf 1',
    storageBin: 'Bin 01',
    unit: 'pcs',
  });

  // Load initial filters metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catsRes, supsRes] = await Promise.all([
          partsAPI.getCategories(),
          suppliersAPI.getSuppliers(),
        ]);
        if (catsRes.data.success) setCategories(catsRes.data.categories);
        if (supsRes.data.success) setSuppliers(supsRes.data.suppliers);
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch parts list
  const fetchParts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await partsAPI.getParts({
        page,
        limit: 10,
        search,
        category: selectedCategory,
        supplier: selectedSupplier,
        stockStatus: stockStatusFilter,
        sortBy,
        sortOrder,
      });
      if (res.data.success) {
        setParts(res.data.data);
        setPagination(res.data.pagination);
        setCurrentPage(page);
      }
    } catch (err) {
      showToast('Failed to load parts catalogue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts(1);
  }, [search, selectedCategory, selectedSupplier, stockStatusFilter, sortBy, sortOrder]);

  // Deep view part details if initialPartId passed
  useEffect(() => {
    if (initialPartId) {
      handleViewDetails(initialPartId);
    }
  }, [initialPartId]);

  const handleViewDetails = async (id) => {
    try {
      const res = await partsAPI.getPartById(id);
      if (res.data.success) {
        setSelectedPartDetail(res.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to load part details', 'error');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPart(null);
    setFormData({
      sku: '',
      name: '',
      category: categories[0] || 'Brakes',
      description: '',
      brand: '',
      compatibleVehicles: '',
      supplier: suppliers[0]?._id || '',
      purchasePrice: '',
      sellingPrice: '',
      totalQuantity: '10',
      minimumStockLevel: '5',
      storageRack: 'Rack A',
      storageShelf: 'Shelf 1',
      storageBin: 'Bin 01',
      unit: 'pcs',
    });
    setPartModalOpen(true);
  };

  const handleOpenEditModal = (part) => {
    setEditingPart(part);
    setFormData({
      sku: part.sku,
      name: part.name,
      category: part.category,
      description: part.description || '',
      brand: part.brand,
      compatibleVehicles: Array.isArray(part.compatibleVehicles) ? part.compatibleVehicles.join(', ') : '',
      supplier: part.supplier?._id || part.supplier,
      purchasePrice: part.purchasePrice,
      sellingPrice: part.sellingPrice,
      totalQuantity: part.totalQuantity,
      minimumStockLevel: part.minimumStockLevel,
      storageRack: part.storageLocation?.rack || 'Rack A',
      storageShelf: part.storageLocation?.shelf || 'Shelf 1',
      storageBin: part.storageLocation?.bin || 'Bin 01',
      unit: part.unit || 'pcs',
    });
    setPartModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        brand: formData.brand,
        compatibleVehicles: formData.compatibleVehicles,
        supplier: formData.supplier,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        minimumStockLevel: Number(formData.minimumStockLevel),
        storageLocation: {
          rack: formData.storageRack,
          shelf: formData.storageShelf,
          bin: formData.storageBin,
        },
        unit: formData.unit,
      };

      if (editingPart) {
        await partsAPI.updatePart(editingPart._id, payload);
        showToast('Part updated successfully', 'success');
      } else {
        payload.totalQuantity = Number(formData.totalQuantity);
        await partsAPI.createPart(payload);
        showToast('Part created successfully', 'success');
      }

      setPartModalOpen(false);
      fetchParts(currentPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save part';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!partToDelete) return;
    setSubmitting(true);
    try {
      await partsAPI.deletePart(partToDelete._id);
      showToast(`Part ${partToDelete.sku} deleted`, 'success');
      setDeleteDialogOpen(false);
      setPartToDelete(null);
      fetchParts(currentPage);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete part';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Spare Parts Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full component catalogue with SKU tracking, stock availability & rack bin mapping
          </p>
        </div>
        {isManager && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            icon={Plus}
          >
            Add New Part
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by part name, SKU, brand, vehicle..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
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

          {/* Stock Condition */}
          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock (≤ Min Level)</option>
              <option value="out_of_stock">Out of Stock (0 Available)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={8} cols={6} />
          </div>
        ) : parts.length === 0 ? (
          <EmptyState
            title="No spare parts found"
            description="No parts match your filter criteria. Try adjusting the search term or category."
            actionLabel={isManager ? 'Add New Part' : null}
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">SKU & Part Name</th>
                  <th className="py-3 px-4">Category & Brand</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Stock Levels</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Price (₹)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.map((part) => {
                  const statusCfg = getStockStatusConfig(part);
                  const available = (part.totalQuantity || 0) - (part.reservedQuantity || 0);

                  return (
                    <tr
                      key={part._id}
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => handleViewDetails(part._id)}
                    >
                      {/* SKU & Part Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-sm">{part.name}</div>
                        <div className="font-mono text-xs text-blue-600 font-medium mt-0.5">{part.sku}</div>
                      </td>

                      {/* Category & Brand */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">{part.category}</div>
                        <div className="text-slate-500 text-[11px]">{part.brand}</div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md font-mono text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {part.storageLocation?.rack || 'Rack A'} • {part.storageLocation?.bin || 'Bin 01'}
                        </div>
                      </td>

                      {/* Stock Numbers (Total, Reserved, Available) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1">
                          <div className="text-left">
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                            <span className="font-semibold text-slate-800">{part.totalQuantity}</span>
                          </div>
                          <div className="h-6 w-px bg-slate-200" />
                          <div className="text-left">
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rsvd</span>
                            <span className="font-semibold text-amber-600">{part.reservedQuantity}</span>
                          </div>
                          <div className="h-6 w-px bg-slate-200" />
                          <div className="text-left">
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Avail</span>
                            <span
                              className={`font-bold ${
                                available <= 0 ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {available}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
                      </td>

                      {/* Selling & Purchase Price */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 text-sm">{formatCurrency(part.sellingPrice)}</div>
                        <div className="text-[11px] text-slate-400">Cost: {formatCurrency(part.purchasePrice)}</div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewDetails(part._id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isManager && (
                            <button
                              onClick={() => handleOpenEditModal(part)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Part"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setPartToDelete(part);
                                setDeleteDialogOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Part"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => fetchParts(p)} />
      </div>

      {/* Part Detail Inspection Drawer / Modal */}
      {selectedPartDetail && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={selectedPartDetail.part.name}
          subtitle={`SKU: ${selectedPartDetail.part.sku} • Category: ${selectedPartDetail.part.category}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Available Stock</span>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {selectedPartDetail.part.availableQuantity} {selectedPartDetail.part.unit}
                </div>
                <span className="text-[11px] text-slate-500">
                  {selectedPartDetail.part.totalQuantity} total • {selectedPartDetail.part.reservedQuantity} reserved
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Retail / Cost</span>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatCurrency(selectedPartDetail.part.sellingPrice)}
                </div>
                <span className="text-[11px] text-slate-500">
                  Cost: {formatCurrency(selectedPartDetail.part.purchasePrice)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Storage Location</span>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {selectedPartDetail.part.storageLocation?.rack}
                </div>
                <span className="text-[11px] text-slate-500">
                  {selectedPartDetail.part.storageLocation?.shelf} / {selectedPartDetail.part.storageLocation?.bin}
                </span>
              </div>
            </div>

            {/* Compatible Vehicles */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Compatible Vehicles & Applications
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedPartDetail.part.compatibleVehicles?.map((veh, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg border border-blue-100"
                  >
                    {veh}
                  </span>
                ))}
              </div>
            </div>

            {/* Active Repair Jobs Utilizing this Part */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Linked Active Repair Jobs ({selectedPartDetail.activeJobs?.length || 0})
                </h4>
              </div>

              {selectedPartDetail.activeJobs?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No active repair jobs currently reserving this part.</p>
              ) : (
                <div className="space-y-2">
                  {selectedPartDetail.activeJobs.map((job) => (
                    <div
                      key={job._id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{job.jobId}</span>
                        <span className="text-slate-600 ml-2">Customer: {job.customerName}</span>
                      </div>
                      <Badge variant="bg-amber-50 text-amber-700 border-amber-200">{job.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Movement Log */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Recent Stock History (Last 5 movements)
              </h4>
              <div className="space-y-2">
                {selectedPartDetail.recentMovements?.slice(0, 5).map((mov) => (
                  <div
                    key={mov._id}
                    className="p-2.5 rounded-lg border border-slate-100 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{mov.type}</span>
                      <span className="text-slate-500 ml-2">({formatDate(mov.createdAt)})</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">{mov.reason || 'Movement'}</div>
                    </div>
                    <span className="font-mono font-bold text-slate-700">{mov.quantity} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Part Modal */}
      <Modal
        isOpen={partModalOpen}
        onClose={() => setPartModalOpen(false)}
        title={editingPart ? 'Edit Spare Part' : 'Add New Spare Part'}
        subtitle="Manage SKU, pricing, supplier & storage location details"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                SKU / Part Number *
              </label>
              <input
                type="text"
                required
                disabled={!!editingPart}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. PRT-BRK-009"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Part Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Front Brake Pad Set"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {[
                  'Brakes',
                  'Engine',
                  'Suspension',
                  'Electrical',
                  'Transmission',
                  'Filters',
                  'Fluids',
                  'Exhaust',
                  'Body & Lighting',
                  'Accessories',
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Manufacturer / Brand *
              </label>
              <input
                type="text"
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Bosch, Brembo, Lumax"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Supplier *
              </label>
              <select
                required
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select a supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.supplierId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="pcs, sets, cans, liters"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Purchase Price (Cost ₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                placeholder="1200"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Selling Price (Retail ₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="1800"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {!editingPart && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Initial Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.totalQuantity}
                  onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Minimum Stock Level (Alert Threshold) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.minimumStockLevel}
                onChange={(e) => setFormData({ ...formData, minimumStockLevel: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Storage Location */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Storage Bin Location
            </label>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Rack A"
                value={formData.storageRack}
                onChange={(e) => setFormData({ ...formData, storageRack: e.target.value })}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <input
                type="text"
                placeholder="Shelf 1"
                value={formData.storageShelf}
                onChange={(e) => setFormData({ ...formData, storageShelf: e.target.value })}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <input
                type="text"
                placeholder="Bin 04"
                value={formData.storageBin}
                onChange={(e) => setFormData({ ...formData, storageBin: e.target.value })}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Compatible Vehicles comma separated */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Compatible Vehicles (comma separated)
            </label>
            <input
              type="text"
              value={formData.compatibleVehicles}
              onChange={(e) => setFormData({ ...formData, compatibleVehicles: e.target.value })}
              placeholder="e.g. Maruti Swift (2018-2023), Hyundai Creta, Kia Seltos"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Description / Notes
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specification notes, OEM cross references..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setPartModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingPart ? 'Save Changes' : 'Create Spare Part'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Spare Part"
        message={`Are you sure you want to delete ${partToDelete?.name} (${partToDelete?.sku})? This action cannot be undone.`}
        confirmText="Delete Part"
        loading={submitting}
      />
    </div>
  );
};
