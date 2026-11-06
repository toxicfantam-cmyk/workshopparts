export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getJobStatusConfig = (status) => {
  switch (status) {
    case 'New':
      return { label: 'New', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'Inspection':
      return { label: 'Inspection', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'In Progress':
      return { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'Waiting for Parts':
      return { label: 'Waiting for Parts', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'Ready for Delivery':
      return { label: 'Ready for Delivery', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'Completed':
      return { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Cancelled':
      return { label: 'Cancelled', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return { label: status || 'Unknown', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
};

export const getPRStatusConfig = (status) => {
  switch (status) {
    case 'Draft':
      return { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'Pending Approval':
      return { label: 'Pending Approval', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'Approved':
      return { label: 'Approved', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'Ordered':
      return { label: 'Ordered', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'Partially Received':
      return { label: 'Partially Received', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'Received':
      return { label: 'Received', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Rejected':
      return { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'Cancelled':
      return { label: 'Cancelled', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return { label: status || 'Unknown', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
};

export const getStockStatusConfig = (part) => {
  const available = (part.totalQuantity || 0) - (part.reservedQuantity || 0);
  if (available <= 0) {
    return { label: 'Out of Stock', color: 'bg-rose-50 text-rose-700 border-rose-200', type: 'OUT_OF_STOCK' };
  }
  if (available <= (part.minimumStockLevel || 5)) {
    return { label: 'Low Stock', color: 'bg-amber-50 text-amber-700 border-amber-200', type: 'LOW_STOCK' };
  }
  return { label: 'In Stock', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', type: 'IN_STOCK' };
};

export const getPriorityBadgeConfig = (priority) => {
  switch (priority) {
    case 'Urgent':
      return { label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-300' };
    case 'High':
      return { label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    case 'Medium':
      return { label: 'Medium', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'Low':
      return { label: 'Low', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return { label: priority, color: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
};
