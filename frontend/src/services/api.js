import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('workshopparts_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('workshopparts_token');
      localStorage.removeItem('workshopparts_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  getUsers: (params) => api.get('/auth/users', { params }),
};

// Parts endpoints
export const partsAPI = {
  getParts: (params) => api.get('/parts', { params }),
  getPartById: (id) => api.get(`/parts/${id}`),
  createPart: (data) => api.post('/parts', data),
  updatePart: (id, data) => api.put(`/parts/${id}`, data),
  deletePart: (id) => api.delete(`/parts/${id}`),
  getCategories: () => api.get('/parts/categories'),
};

// Inventory endpoints
export const inventoryAPI = {
  getMovements: (params) => api.get('/inventory/movements', { params }),
  getAlerts: () => api.get('/inventory/alerts'),
  adjustStock: (data) => api.post('/inventory/adjust', data),
  receiveManual: (data) => api.post('/inventory/receive', data),
};

// Repair Jobs endpoints
export const repairJobsAPI = {
  getJobs: (params) => api.get('/repair-jobs', { params }),
  getJobById: (id) => api.get(`/repair-jobs/${id}`),
  createJob: (data) => api.post('/repair-jobs', data),
  updateJob: (id, data) => api.put(`/repair-jobs/${id}`, data),
  recheckAndReserve: (id) => api.post(`/repair-jobs/${id}/reserve`),
  cancelJob: (id) => api.post(`/repair-jobs/${id}/cancel`),
};

// Purchase Requests endpoints
export const purchaseRequestsAPI = {
  getRequests: (params) => api.get('/purchase-requests', { params }),
  getRequestById: (id) => api.get(`/purchase-requests/${id}`),
  createRequest: (data) => api.post('/purchase-requests', data),
  updateStatus: (id, data) => api.patch(`/purchase-requests/${id}/status`, data),
  receiveStock: (id, data) => api.post(`/purchase-requests/${id}/receive`, data),
};

// Suppliers endpoints
export const suppliersAPI = {
  getSuppliers: (params) => api.get('/suppliers', { params }),
  getSupplierById: (id) => api.get(`/suppliers/${id}`),
  createSupplier: (data) => api.post('/suppliers', data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/suppliers/${id}`),
};

// Dashboard endpoints
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Reports endpoints
export const reportsAPI = {
  getValuation: (params) => api.get('/reports/valuation', { params }),
  getConsumption: (params) => api.get('/reports/consumption', { params }),
  getWaitingJobs: () => api.get('/reports/waiting-jobs'),
  getSpending: () => api.get('/reports/spending'),
};

// System / Seed endpoints
export const systemAPI = {
  resetDatabase: () => api.post('/seed/reset'),
  healthCheck: () => api.get('/health'),
};

export default api;
