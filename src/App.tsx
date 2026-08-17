import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.js';
import { LoginPage } from './components/LoginPage.js';
import { Header } from './components/Header.js';
import { Sidebar, NavTab } from './components/Sidebar.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { DailySalesPage } from './components/DailySalesPage.js';
import { CustomersPage } from './components/CustomersPage.js';
import { UserManagementPage } from './components/UserManagementPage.js';
import { SettingsPage } from './components/SettingsPage.js';
import { CustomerEntryModal } from './components/CustomerEntryModal.js';
import { api } from './lib/api.js';
import { DashboardSummary, CustomerEntry } from './types.js';

export function App() {
  const { user, isAuthenticated, isSuperAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Shared Data State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentEntries, setRecentEntries] = useState<CustomerEntry[]>([]);

  // Entry Modal State
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CustomerEntry | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, activeTab]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [sumRes, entRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getEntries({ startDate: today, endDate: today }),
      ]);
      setSummary(sumRes);
      setRecentEntries(entRes);
    } catch (e) {
      console.error('Failed to fetch dashboard metrics:', e);
    }
  };

  const handleOpenNewEntry = () => {
    setEditingEntry(null);
    setEntryModalOpen(true);
  };

  const handleOpenEditEntry = (entry: CustomerEntry) => {
    setEditingEntry(entry);
    setEntryModalOpen(true);
  };

  const handleEntrySaved = () => {
    fetchDashboardData();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-amber-400 font-mono text-xs">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading The Cloud Spa System...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navigation Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenNewEntry={handleOpenNewEntry}
        summary={summary}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          onOpenNewEntry={handleOpenNewEntry}
        />

        {/* Content View Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <AdminDashboard
              summary={summary}
              recentEntries={recentEntries}
              onOpenNewEntry={handleOpenNewEntry}
              onNavigateToDsr={() => setActiveTab('dsr')}
              onEditEntry={handleOpenEditEntry}
            />
          )}

          {activeTab === 'dsr' && (
            <DailySalesPage
              onOpenNewEntry={handleOpenNewEntry}
              onEditEntry={handleOpenEditEntry}
            />
          )}

          {activeTab === 'customers' && <CustomersPage />}

          {activeTab === 'users' && (
            isSuperAdmin ? <UserManagementPage /> : <PermissionDeniedView />
          )}

          {activeTab === 'settings' && (
            isSuperAdmin ? <SettingsPage /> : <PermissionDeniedView />
          )}
        </main>
      </div>

      {/* Customer Entry Form Modal */}
      <CustomerEntryModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        initialData={editingEntry}
        onSuccess={handleEntrySaved}
      />
    </div>
  );
}

function PermissionDeniedView() {
  return (
    <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl text-center space-y-3">
      <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
        🔒
      </div>
      <h2 className="text-lg font-bold text-stone-100 font-serif">Access Denied</h2>
      <p className="text-xs text-stone-400 max-w-md mx-auto">
        You do not have required Super Admin authorizations to view this section.
      </p>
    </div>
  );
}

export default App;
