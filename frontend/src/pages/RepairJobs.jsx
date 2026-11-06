import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Car,
  Calendar,
  X,
  Trash2,
} from 'lucide-react';
import { repairJobsAPI, partsAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { formatCurrency, formatDate, getJobStatusConfig, getPriorityBadgeConfig } from '../utils/formatters';

export const RepairJobs = ({ onSelectJob, onCreatePOFromJob }) => {
  const { user, isManager, isTechnician } = useAuth();
  const { showToast } = useNotification();

  // State
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [partsList, setPartsList] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleMake: 'Maruti Suzuki',
    vehicleModel: 'Swift',
    vehicleYear: 2021,
    registrationNumber: '',
    assignedTechnician: '',
    description: '',
    priority: 'Medium',
    estimatedLaborCost: '1200',
    requiredParts: [],
  });

  // Load Technicians & Parts metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [usersRes, partsRes] = await Promise.all([
          authAPI.getUsers({ role: 'Technician' }),
          partsAPI.getParts({ limit: 100 }),
        ]);
        if (usersRes.data.success) setTechnicians(usersRes.data.users);
        if (partsRes.data.success) setPartsList(partsRes.data.data);
      } catch (err) {
        console.error('Failed to load job meta:', err);
      }
    };
    fetchMeta();
  }, []);

  const fetchJobs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await repairJobsAPI.getJobs({
        page,
        limit: 10,
        status: statusFilter,
        priority: priorityFilter,
        technicianId: technicianFilter,
        search,
      });
      if (res.data.success) {
        setJobs(res.data.data);
        setPagination(res.data.pagination);
        setCurrentPage(page);
      }
    } catch (err) {
      showToast('Failed to load repair jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(1);
  }, [statusFilter, priorityFilter, technicianFilter, search]);

  const handleOpenCreateModal = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      vehicleMake: 'Maruti Suzuki',
      vehicleModel: 'Swift',
      vehicleYear: 2021,
      registrationNumber: '',
      assignedTechnician: technicians[0]?._id || '',
      description: '',
      priority: 'Medium',
      estimatedLaborCost: '1200',
      requiredParts: [],
    });
    setCreateModalOpen(true);
  };

  const handleAddPartToJob = (partId) => {
    if (!partId) return;
    const part = partsList.find((p) => p._id === partId);
    if (!part) return;

    if (formData.requiredParts.some((p) => p.partId === partId)) {
      showToast('Part already added to this job', 'warning');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      requiredParts: [
        ...prev.requiredParts,
        {
          partId: part._id,
          name: part.name,
          sku: part.sku,
          price: part.sellingPrice,
          available: (part.totalQuantity || 0) - (part.reservedQuantity || 0),
          quantity: 1,
        },
      ],
    }));
  };

  const handleUpdatePartQty = (partId, qty) => {
    setFormData((prev) => ({
      ...prev,
      requiredParts: prev.requiredParts.map((p) =>
        p.partId === partId ? { ...p, quantity: Math.max(1, Number(qty) || 1) } : p
      ),
    }));
  };

  const handleRemovePartFromJob = (partId) => {
    setFormData((prev) => ({
      ...prev,
      requiredParts: prev.requiredParts.filter((p) => p.partId !== partId),
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.registrationNumber || !formData.description) {
      showToast('Please fill out all required fields', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        vehicleDetails: {
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          year: Number(formData.vehicleYear),
        },
        registrationNumber: formData.registrationNumber,
        assignedTechnician: formData.assignedTechnician || null,
        description: formData.description,
        priority: formData.priority,
        estimatedLaborCost: Number(formData.estimatedLaborCost) || 0,
        requiredParts: formData.requiredParts.map((p) => ({
          partId: p.partId,
          quantityRequired: Number(p.quantity),
        })),
      };

      const res = await repairJobsAPI.createJob(payload);
      if (res.data.success) {
        const createdJob = res.data.job;
        if (createdJob.status === 'Waiting for Parts') {
          showToast(
            `Job ${createdJob.jobId} created! Automatically flagged as "Waiting for Parts" due to stock shortage.`,
            'warning',
            6000
          );
        } else {
          showToast(
            `Job ${createdJob.jobId} created! All required parts successfully reserved. Status: In Progress.`,
            'success',
            5000
          );
        }
        setCreateModalOpen(false);
        fetchJobs(1);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create repair job';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Repair Jobs Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic inventory shortage detection, part reservations & technician job tracking
          </p>
        </div>

        {isManager && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            icon={Plus}
          >
            Create Repair Job
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        {/* Status quick tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Jobs' },
            { id: 'Waiting for Parts', label: 'Waiting for Parts' },
            { id: 'In Progress', label: 'In Progress' },
            { id: 'Inspection', label: 'Inspection' },
            { id: 'New', label: 'New' },
            { id: 'Ready for Delivery', label: 'Ready for Delivery' },
            { id: 'Completed', label: 'Completed' },
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job ID, customer, vehicle or plate #..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
            />
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
            >
              <option value="all">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
            >
              <option value="all">All Technicians</option>
              {technicians.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Jobs List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={8} cols={6} />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No repair jobs found"
            description="No jobs match your filter criteria."
            actionLabel={isManager ? 'Create Repair Job' : null}
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Job ID & Priority</th>
                  <th className="py-3 px-4">Customer & Contact</th>
                  <th className="py-3 px-4">Vehicle Details</th>
                  <th className="py-3 px-4">Required Parts & Status</th>
                  <th className="py-3 px-4">Assigned Tech</th>
                  <th className="py-3 px-4">Job Status</th>
                  <th className="py-3 px-4 text-right">Est. Cost</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const statusCfg = getJobStatusConfig(job.status);
                  const priorityCfg = getPriorityBadgeConfig(job.priority);
                  const isBlocked = job.status === 'Waiting for Parts';

                  return (
                    <tr
                      key={job._id}
                      onClick={() => onSelectJob(job._id)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isBlocked ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Job ID & Priority */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm font-mono">{job.jobId}</div>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${priorityCfg.color}`}
                          >
                            {job.priority}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{job.customerName}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{job.customerPhone}</div>
                      </td>

                      {/* Vehicle */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {job.vehicleDetails?.make} {job.vehicleDetails?.model} ({job.vehicleDetails?.year})
                        </div>
                        <div className="font-mono text-[11px] text-blue-600 font-semibold mt-0.5">
                          {job.registrationNumber}
                        </div>
                      </td>

                      {/* Required Parts status summary */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700">
                          {job.requiredParts?.length || 0} part(s) specified
                        </div>
                        {isBlocked ? (
                          <div className="flex items-center gap-1 text-[11px] text-rose-600 font-bold mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Shortage Detected</span>
                          </div>
                        ) : job.requiredParts?.length > 0 ? (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-0.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Parts Reserved</span>
                          </div>
                        ) : null}
                      </td>

                      {/* Technician */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.technicianName || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* Job Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
                      </td>

                      {/* Total Cost */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatCurrency(job.totalEstimatedCost)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Parts: {formatCurrency(job.totalPartsCost)}
                        </div>
                      </td>

                      {/* View Action */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onSelectJob(job._id)}
                          icon={Eye}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination pagination={pagination} onPageChange={(p) => fetchJobs(p)} />
      </div>

      {/* Create Repair Job Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Repair Job"
        subtitle="Specify vehicle details, technician & required parts. System automatically checks inventory."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="e.g. Ramesh Chandra"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Customer Phone *
              </label>
              <input
                type="text"
                required
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+91 98200 12345"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Customer Email
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="customer@gmail.com"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Vehicle Make *
              </label>
              <input
                type="text"
                required
                value={formData.vehicleMake}
                onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                placeholder="Maruti Suzuki"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Vehicle Model *
              </label>
              <input
                type="text"
                required
                value={formData.vehicleModel}
                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                placeholder="Swift VXi"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Model Year *
              </label>
              <input
                type="number"
                required
                value={formData.vehicleYear}
                onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Registration / Plate # *
              </label>
              <input
                type="text"
                required
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                placeholder="MH-02-AB-1234"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase font-mono"
              />
            </div>
          </div>

          {/* Technician & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Assigned Technician
              </label>
              <select
                value={formData.assignedTechnician}
                onChange={(e) => setFormData({ ...formData, assignedTechnician: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Job Priority
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Estimated Labor Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.estimatedLaborCost}
                onChange={(e) => setFormData({ ...formData, estimatedLaborCost: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Job Description / Customer Complaint *
            </label>
            <textarea
              rows="2"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Brake noise during deceleration, replacing front brake pads & regular service..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Required Parts Selector Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Required Spare Parts
              </label>
              <span className="text-xs text-slate-500">
                System tests availability in real-time
              </span>
            </div>

            {/* Quick Part Adder */}
            <div className="flex gap-2 mb-3">
              <select
                id="select-part-dropdown"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPartToJob(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="" disabled>
                  + Select a spare part to add to job...
                </option>
                {partsList.map((p) => {
                  const avail = (p.totalQuantity || 0) - (p.reservedQuantity || 0);
                  return (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku}) — Available in stock: {avail}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected Parts List */}
            {formData.requiredParts.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No spare parts added yet. Select a part from the dropdown above.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {formData.requiredParts.map((item) => {
                  const isShortage = item.available < item.quantity;
                  return (
                    <div
                      key={item.partId}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isShortage
                          ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-[11px] opacity-75 flex gap-2 mt-0.5">
                          <span className="font-mono">{item.sku}</span>
                          <span>•</span>
                          <span>In Stock: {item.available}</span>
                          {isShortage && (
                            <span className="font-bold text-rose-600">
                              (Shortage: {item.quantity - item.available})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-medium text-slate-500">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdatePartQty(item.partId, e.target.value)}
                            className="w-14 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-center font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePartFromJob(item.partId)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create & Validate Inventory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
