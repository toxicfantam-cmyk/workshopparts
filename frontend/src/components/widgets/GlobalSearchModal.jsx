import React, { useState, useEffect } from 'react';
import { Search, Package, Wrench, ShoppingCart, Truck, ArrowRight, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { partsAPI, repairJobsAPI, purchaseRequestsAPI, suppliersAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export const GlobalSearchModal = ({ isOpen, onClose, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    parts: [],
    jobs: [],
    prs: [],
    suppliers: [],
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onNavigate(null, 'open_search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate]);

  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setResults({ parts: [], jobs: [], prs: [], suppliers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [partsRes, jobsRes, prsRes, supRes] = await Promise.all([
          partsAPI.getParts({ search: searchTerm, limit: 4 }),
          repairJobsAPI.getJobs({ search: searchTerm, limit: 4 }),
          purchaseRequestsAPI.getRequests({ search: searchTerm, limit: 4 }),
          suppliersAPI.getSuppliers({ search: searchTerm }),
        ]);

        setResults({
          parts: partsRes.data.data || [],
          jobs: jobsRes.data.data || [],
          prs: prsRes.data.data || [],
          suppliers: (supRes.data.suppliers || []).slice(0, 4),
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const hasAnyResults =
    results.parts.length > 0 ||
    results.jobs.length > 0 ||
    results.prs.length > 0 ||
    results.suppliers.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" showClose={false}>
      {/* Search Input Box */}
      <div className="relative -mt-2 -mx-2 mb-4">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          autoFocus
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type to search parts, repair jobs, purchase orders, or suppliers..."
          className="w-full pl-12 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder:text-slate-400"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-3.5 w-5 h-5 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Results listing */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {!searchTerm && (
          <div className="text-center py-8 text-xs text-slate-400">
            Search by part name, SKU, vehicle model, customer name, registration number, or PO number.
          </div>
        )}

        {searchTerm && !loading && !hasAnyResults && (
          <div className="text-center py-8 text-sm text-slate-500">
            No matching records found for "{searchTerm}".
          </div>
        )}

        {/* Parts Results */}
        {results.parts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Package className="w-3.5 h-3.5" />
              Spare Parts ({results.parts.length})
            </div>
            <div className="space-y-1">
              {results.parts.map((part) => (
                <div
                  key={part._id}
                  onClick={() => {
                    onClose();
                    onNavigate('parts', part._id);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{part.name}</div>
                    <div className="text-xs text-slate-500 flex gap-2">
                      <span className="font-mono text-slate-600">{part.sku}</span>
                      <span>•</span>
                      <span>{part.category}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{formatCurrency(part.sellingPrice)}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Jobs Results */}
        {results.jobs.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Wrench className="w-3.5 h-3.5" />
              Repair Jobs ({results.jobs.length})
            </div>
            <div className="space-y-1">
              {results.jobs.map((job) => (
                <div
                  key={job._id}
                  onClick={() => {
                    onClose();
                    onNavigate('jobs', job._id);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <span>{job.jobId}</span>
                      <span className="text-xs font-normal text-slate-500">— {job.customerName}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {job.registrationNumber} • {job.vehicleDetails?.make} {job.vehicleDetails?.model} • Status: {job.status}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Purchase Requests */}
        {results.prs.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <ShoppingCart className="w-3.5 h-3.5" />
              Purchase Requests ({results.prs.length})
            </div>
            <div className="space-y-1">
              {results.prs.map((pr) => (
                <div
                  key={pr._id}
                  onClick={() => {
                    onClose();
                    onNavigate('purchases', pr._id);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <span>{pr.requestNumber}</span>
                      <span className="text-xs font-normal text-slate-500">— {pr.supplierName}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {pr.items?.length || 0} items • {formatCurrency(pr.totalEstimatedCost)} • Status: {pr.status}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suppliers */}
        {results.suppliers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Truck className="w-3.5 h-3.5" />
              Suppliers ({results.suppliers.length})
            </div>
            <div className="space-y-1">
              {results.suppliers.map((sup) => (
                <div
                  key={sup._id}
                  onClick={() => {
                    onClose();
                    onNavigate('suppliers', sup._id);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{sup.name}</div>
                    <div className="text-xs text-slate-500">
                      {sup.supplierId} • Contact: {sup.contactPerson} ({sup.phone})
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
