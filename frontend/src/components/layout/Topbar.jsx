import React from 'react';
import {
  Menu,
  Search,
  Plus,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { systemAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const Topbar = ({
  activeTab,
  onOpenMobileMenu,
  onOpenSearch,
  onOpenQuickActions,
  alertCount = 0,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Overview of stock, repair jobs & purchasing' };
      case 'parts':
        return { title: 'Parts Catalogue', subtitle: 'Manage spare parts inventory, SKUs and pricing' };
      case 'inventory':
        return { title: 'Inventory Movements', subtitle: 'Audit trail of received, issued & adjusted parts' };
      case 'jobs':
        return { title: 'Repair Jobs', subtitle: 'Workshop jobs, part reservations & technician assignments' };
      case 'purchases':
        return { title: 'Purchase Requests', subtitle: 'Procurement workflows, supplier orders & stock receipts' };
      case 'suppliers':
        return { title: 'Suppliers', subtitle: 'Authorized automotive component suppliers & metrics' };
      case 'alerts':
        return { title: 'Stock Alerts', subtitle: 'Critical low-stock, out-of-stock & job shortages' };
      case 'reports':
        return { title: 'Reports & Analytics', subtitle: 'Financial valuation, consumption & supplier reports' };
      default:
        return { title: 'WorkshopParts', subtitle: 'Inventory & Workshop Management' };
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset database to clean default demo data?')) return;
    try {
      await systemAPI.resetDatabase();
      showToast('Database reset and demo data re-seeded successfully', 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showToast('Failed to reset demo data', 'error');
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Right: Search bar, quick actions, reset demo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Search parts, jobs, POs...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Demo reset button */}
        <button
          onClick={handleResetDemoData}
          title="Reset database with initial demo data"
          className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Demo</span>
        </button>

        {/* Quick Action Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenQuickActions}
          icon={Plus}
          className="shadow-xs"
        >
          <span className="hidden sm:inline">Quick Action</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>
    </header>
  );
};
