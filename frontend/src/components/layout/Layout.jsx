import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearchModal } from '../widgets/GlobalSearchModal';
import { QuickActionsModal } from '../widgets/QuickActionsModal';

export const Layout = ({
  children,
  activeTab,
  setActiveTab,
  alertCount,
  onQuickAction,
  onRefreshData,
  onNavigateDetail,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={mobileMenuOpen}
        setIsOpen={setMobileMenuOpen}
        alertCount={alertCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenQuickActions={() => setQuickActionsOpen(true)}
          alertCount={alertCount}
          onRefreshData={onRefreshData}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab, id) => {
          if (tab === null && id === 'open_search') {
            setSearchOpen(true);
            return;
          }
          if (tab) {
            setActiveTab(tab);
            if (onNavigateDetail) onNavigateDetail(tab, id);
          }
        }}
      />

      {/* Quick Actions Dialog */}
      <QuickActionsModal
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        onSelectAction={(actionId) => {
          if (onQuickAction) onQuickAction(actionId);
        }}
      />
    </div>
  );
};
