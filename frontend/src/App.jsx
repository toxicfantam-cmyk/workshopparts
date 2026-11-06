import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useNotification } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PartsCatalogue } from './pages/PartsCatalogue';
import { Inventory } from './pages/Inventory';
import { RepairJobs } from './pages/RepairJobs';
import { RepairJobDetail } from './pages/RepairJobDetail';
import { PurchaseRequests } from './pages/PurchaseRequests';
import { Suppliers } from './pages/Suppliers';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { inventoryAPI } from './services/api';

export const App = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [initialCreatePRData, setInitialCreatePRData] = useState(null);
  const [alertCount, setAlertCount] = useState(0);

  // Fetch alert count for navigation badges
  const fetchAlertCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await inventoryAPI.getAlerts();
      if (res.data.success) {
        setAlertCount(res.data.outOfStockCount + res.data.lowStockCount);
      }
    } catch (err) {
      console.error('Error fetching alerts count:', err);
    }
  };

  useEffect(() => {
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wide text-slate-300">Loading WorkshopParts...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Handle Quick Action triggers
  const handleQuickAction = (actionId, extraData = null) => {
    if (actionId === 'new_job') {
      setActiveTab('jobs');
      setSelectedJobId(null);
    } else if (actionId === 'new_part') {
      setActiveTab('parts');
    } else if (actionId === 'new_po') {
      setActiveTab('purchases');
      if (extraData) setInitialCreatePRData(extraData);
    } else if (actionId === 'receive_stock') {
      setActiveTab('inventory');
    } else if (actionId === 'adjust_stock') {
      setActiveTab('inventory');
    }
  };

  // Handle Trigger PO from Shortage or Low-Stock Alert
  const handleTriggerPO = (poData) => {
    setInitialCreatePRData(poData);
    setActiveTab('purchases');
  };

  // Navigate directly to details from search or links
  const handleNavigateDetail = (tab, id) => {
    setActiveTab(tab);
    if (tab === 'jobs') setSelectedJobId(id);
    if (tab === 'parts') setSelectedPartId(id);
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedJobId(null); // clear detail drill-down when changing tab
      }}
      alertCount={alertCount}
      onQuickAction={handleQuickAction}
      onRefreshData={fetchAlertCount}
      onNavigateDetail={handleNavigateDetail}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          onNavigate={(tab, id) => {
            setActiveTab(tab);
            if (tab === 'jobs' && id) setSelectedJobId(id);
            if (tab === 'parts' && id) setSelectedPartId(id);
          }}
          onQuickAction={handleQuickAction}
        />
      )}

      {activeTab === 'parts' && (
        <PartsCatalogue
          initialPartId={selectedPartId}
          onQuickAction={handleQuickAction}
        />
      )}

      {activeTab === 'inventory' && <Inventory onNavigate={setActiveTab} />}

      {activeTab === 'jobs' && (
        selectedJobId ? (
          <RepairJobDetail
            jobId={selectedJobId}
            onBack={() => setSelectedJobId(null)}
            onGeneratePO={(job, shortages) => handleTriggerPO({ job, shortages })}
          />
        ) : (
          <RepairJobs
            onSelectJob={(id) => setSelectedJobId(id)}
            onCreatePOFromJob={(job, shortages) => handleTriggerPO({ job, shortages })}
          />
        )
      )}

      {activeTab === 'purchases' && (
        <PurchaseRequests
          initialCreateData={initialCreatePRData}
          onClearInitialCreate={() => setInitialCreatePRData(null)}
        />
      )}

      {activeTab === 'suppliers' && (
        <Suppliers onSelectSupplier={() => {}} />
      )}

      {activeTab === 'alerts' && (
        <Alerts
          onNavigate={(tab, id) => {
            setActiveTab(tab);
            if (tab === 'jobs' && id) setSelectedJobId(id);
          }}
          onTriggerPO={handleTriggerPO}
        />
      )}

      {activeTab === 'reports' && <Reports />}
    </Layout>
  );
};
