/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { JobRecord, Language, User, UserRole } from './types';
import { StorageService } from './services/storage';
import { syncPreferredLanguage } from './services/languageSettings';
import { LANGUAGE_STORAGE_KEY } from './i18n/translations';
import { LanguageProvider } from './i18n/LanguageContext';
import {
  canAccessTab,
  canManagePricing,
  canViewReports,
  defaultTabForRole,
} from './services/permissions';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { ReceptionDashboard } from './components/reception/ReceptionDashboard';
import { FinanceDashboard } from './components/finance/FinanceDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StoreDashboard } from './components/store/StoreDashboard';
import { DatasHistoryPage } from './components/archive/DatasHistoryPage';
import { RepairEstimatePage } from './components/estimate/RepairEstimatePage';
import { JobDetailModal } from './components/common/JobDetailModal';
import { FinanceCostModal } from './components/finance/FinanceCostModal';
import { ReportsModal } from './components/reports/ReportsModal';
import { SettingsModal } from './components/settings/SettingsModal';

const getStoredLanguage = (): Language => {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'am';
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    StorageService.getCurrentUser()
  );
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [jobs, setJobs] = useState<JobRecord[]>(() => StorageService.getJobs());
  const [language, setLanguage] = useState<Language>(() => {
    const savedUser = StorageService.getCurrentUser();
    return savedUser?.preferredLanguage ?? getStoredLanguage();
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Determine initial dashboard tab based on role
  const getDefaultTabForRole = (role: UserRole): string => defaultTabForRole(role);

  const [activeTab, setActiveTab] = useState<string>(() =>
    currentUser ? getDefaultTabForRole(currentUser.role) : 'reception'
  );

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('feyamet_sidebar_collapsed') === '1'
  );
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobRecord | null>(null);
  const [selectedJobForCost, setSelectedJobForCost] = useState<JobRecord | null>(null);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  // Keep tablet portrait layouts spacious: use the compact icon rail automatically.
  useEffect(() => {
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const applyTabletLayout = () => {
      if (tabletQuery.matches) setIsSidebarCollapsed(true);
    };
    applyTabletLayout();
    tabletQuery.addEventListener('change', applyTabletLayout);
    return () => tabletQuery.removeEventListener('change', applyTabletLayout);
  }, []);

  // Route guard: never render a dashboard the signed-in role cannot access.
  useEffect(() => {
    if (currentUser && !canAccessTab(currentUser.role, activeTab)) {
      setActiveTab(defaultTabForRole(currentUser.role));
    }
    if (currentUser && !canViewReports(currentUser.role) && isReportsOpen) {
      setIsReportsOpen(false);
    }
    if (currentUser && !canManagePricing(currentUser.role) && selectedJobForCost) {
      setSelectedJobForCost(null);
    }
  }, [currentUser, activeTab, isReportsOpen, selectedJobForCost]);

  const handleNavigate = (tab: string) => {
    if (currentUser && canAccessTab(currentUser.role, tab)) setActiveTab(tab);
  };

  // Subscribe to storage updates across tabs / components
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setJobs(StorageService.getJobs());
      setUsers(StorageService.getUsers());
      // Refresh selected job reference if modal is open
      if (selectedJobForDetail) {
        const fresh = StorageService.getJobById(selectedJobForDetail.id);
        if (fresh) setSelectedJobForDetail(fresh);
      }
    });
    return unsubscribe;
  }, [selectedJobForDetail]);

  const handleLogin = (user: User) => {
    const preferred = user.preferredLanguage ?? 'am';
    const resolved = user.preferredLanguage
      ? user
      : StorageService.updateUserLanguage(user.id, preferred) ?? user;
    StorageService.setCurrentUser(resolved);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, preferred);
    setCurrentUser(resolved);
    setLanguage(preferred);
    setActiveTab(getDefaultTabForRole(resolved.role));
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleSwitchUser = (user: User) => {
    const preferred = user.preferredLanguage ?? 'am';
    const resolved = user.preferredLanguage
      ? user
      : StorageService.updateUserLanguage(user.id, preferred) ?? user;
    StorageService.setCurrentUser(resolved);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, preferred);
    setCurrentUser(resolved);
    setLanguage(preferred);
    setActiveTab(getDefaultTabForRole(resolved.role));
  };

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    if (!currentUser) return;

    const updated = StorageService.updateUserLanguage(currentUser.id, next);
    if (updated) setCurrentUser(updated);
    void syncPreferredLanguage(currentUser.id, next);
  };


  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('feyamet_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  };

  const handleRefreshJobs = () => {
    setJobs(StorageService.getJobs());
  };

  const handleRefreshUsers = () => {
    setUsers(StorageService.getUsers());
  };

  // If not authenticated, show login page directly (no marketing / public landing page)
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} availableUsers={users} />;
  }

  return (
    <LanguageProvider language={language} onLanguageChange={handleLanguageChange}>
    <div className="app-shell h-[100dvh] overflow-hidden bg-cream text-ink flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        allUsers={users}
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        onOpenReports={() => setIsReportsOpen(true)}

        onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
        jobs={jobs}
        onOpenJob={(job) => setSelectedJobForDetail(job)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={handleNavigate}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
          onOpenReports={() => setIsReportsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />

        {/* Main Content Viewport */}
        <main className="app-main flex-1 smooth-scroll overflow-y-auto w-full">
          <div className="p-3 sm:p-5 md:p-6 max-w-7xl mx-auto w-full pb-24 md:pb-6">
          {activeTab === 'reception' && (
            <ReceptionDashboard
              jobs={jobs}
              currentUser={currentUser}
              onOpenJobDetail={(job) => setSelectedJobForDetail(job)}
              onRefreshJobs={handleRefreshJobs}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceDashboard
              jobs={jobs}
              currentUser={currentUser}
              onOpenJobDetail={(job) => setSelectedJobForDetail(job)}
              onRefreshJobs={handleRefreshJobs}
            />
          )}

          {activeTab === 'manager' && (
            <ManagerDashboard
              jobs={jobs}
              currentUser={currentUser}
              allUsers={users}
              onOpenJobDetail={(job) => setSelectedJobForDetail(job)}
              onRefreshJobs={handleRefreshJobs}
              onOpenDatasArchive={() => setActiveTab('datas_history')}
            />
          )}

          {activeTab === 'store' && (
            <StoreDashboard currentUser={currentUser} />
          )}

          {activeTab === 'datas_history' && (
            <DatasHistoryPage
              jobs={jobs}
              currentUser={currentUser}
              onOpenJobDetail={(job) => setSelectedJobForDetail(job)}
              onRefreshJobs={handleRefreshJobs}
              onBackToManager={() => setActiveTab('manager')}
            />
          )}

          {activeTab === 'estimate' && <RepairEstimatePage currentUser={currentUser} />}

          {activeTab === 'admin' && (
            <AdminDashboard
              currentUser={currentUser}
              allUsers={users}
              onRefreshUsers={handleRefreshUsers}
              onRefreshJobs={handleRefreshJobs}
            />
          )}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        onOpenReports={() => setIsReportsOpen(true)}
      />

      {/* Shared Job Details Modal (Central Single Source of Truth) */}
      {selectedJobForDetail && (
        <JobDetailModal
          job={selectedJobForDetail}
          isOpen={true}
          onClose={() => setSelectedJobForDetail(null)}
          currentUser={currentUser}
          onJobUpdated={() => {
            handleRefreshJobs();
          }}
          onOpenCostEditor={
            canManagePricing(currentUser.role)
              ? (job) => setSelectedJobForCost(job)
              : undefined
          }
        />
      )}

      {/* Direct Finance Cost Modal */}
      {selectedJobForCost && (
        <FinanceCostModal
          job={selectedJobForCost}
          isOpen={true}
          onClose={() => setSelectedJobForCost(null)}
          currentUser={currentUser}
          onJobUpdated={() => {
            handleRefreshJobs();
          }}
        />
      )}

      {/* Dedicated PDF, Printing & Reports Center */}
      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        jobs={jobs}
        currentUser={currentUser}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
      />
    </div>
    </LanguageProvider>
  );
}
