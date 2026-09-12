import React, { useState, useEffect } from 'react';
import { User, SchoolSettings } from './types';
import { api } from './services/api';
import { storageSync } from './services/storageSync';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { QuickViolationModal } from './components/QuickViolationModal';
import { QuickRewardModal } from './components/QuickRewardModal';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { HalaqahPage } from './pages/HalaqahPage';
import { TeachersPage } from './pages/TeachersPage';
import { ViolationsMasterPage } from './pages/ViolationsMasterPage';
import { RecordsHistoryPage } from './pages/RecordsHistoryPage';
import { PositiveRecordsPage } from './pages/PositiveRecordsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ParentPortalPage } from './pages/ParentPortalPage';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Parent Portal state (accessible without login)
  const [showParentPortal, setShowParentPortal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.has('nis') || urlParams.get('portal') === 'wali';
    }
    return false;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isQuickRecordOpen, setIsQuickRecordOpen] = useState<boolean>(false);
  const [isQuickRewardOpen, setIsQuickRewardOpen] = useState<boolean>(false);
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // Load user session, settings, and trigger multi-device server synchronization on mount
  useEffect(() => {
    const savedUser =
      localStorage.getItem('halaqah_user') || sessionStorage.getItem('halaqah_user');

    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('halaqah_user');
      }
    }

    // Synchronize with server once on mount to ensure multi-device consistency
    storageSync.syncWithServer().finally(() => {
      loadSettings();
    });
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.settings.get();
      if (data.settings) {
        setSettings(data.settings);
        document.title = `${data.settings.app_name} - ${data.settings.school_name}`;
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setAppLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentTab('dashboard');
  };

  const handleUserUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('halaqah_user', JSON.stringify(updatedUser));
    if (sessionStorage.getItem('halaqah_user')) {
      sessionStorage.setItem('halaqah_user', JSON.stringify(updatedUser));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('halaqah_user');
    sessionStorage.removeItem('halaqah_user');
    setCurrentUser(null);
    setCurrentTab('dashboard');
    setSelectedStudentId(null);
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setCurrentTab('student_detail');
  };

  const handleBackToStudents = () => {
    setSelectedStudentId(null);
    setCurrentTab('students');
  };

  if (appLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-white tracking-wider uppercase">
            Menyiapkan Sistem Halaqah...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, allow toggling between Staff Login and Parent Portal
  if (!currentUser) {
    if (showParentPortal) {
      return (
        <ParentPortalPage
          settings={settings}
          onBackToLogin={() => {
            setShowParentPortal(false);
            const url = new URL(window.location.href);
            url.searchParams.delete('portal');
            url.searchParams.delete('nis');
            window.history.replaceState({}, '', url.toString());
          }}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        settings={settings}
        onOpenParentPortal={() => setShowParentPortal(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#091122] text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Sidebar for Desktop (Fixed full height) & Mobile Drawer */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedStudentId(null);
        }}
        userRole={currentUser.role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenQuickRecord={() => setIsQuickRecordOpen(true)}
        onOpenQuickReward={() => setIsQuickRewardOpen(true)}
        settings={settings}
        onSettingsUpdated={loadSettings}
        userName={currentUser.name}
      />

      {/* Main Content Shell (Smoothly offset by lg:pl-64 on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          settings={settings}
          onLogout={handleLogout}
          onOpenQuickRecord={() => setIsQuickRecordOpen(true)}
          onOpenQuickReward={() => setIsQuickRewardOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSelectedStudentId(null);
          }}
          onSettingsUpdated={loadSettings}
        />

        {/* Page Content Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-24 lg:pb-12">
          {currentTab === 'dashboard' && (
            <Dashboard
              currentUser={currentUser}
              onOpenQuickRecord={() => setIsQuickRecordOpen(true)}
              onOpenQuickReward={() => setIsQuickRewardOpen(true)}
              onSelectTab={setCurrentTab}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {currentTab === 'students' && (
            <StudentsPage
              currentUser={currentUser}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {currentTab === 'student_detail' && selectedStudentId && (
            <StudentDetailPage
              studentId={selectedStudentId}
              onBack={handleBackToStudents}
              settings={settings}
            />
          )}

          {currentTab === 'halaqah' && (
            <HalaqahPage
              currentUser={currentUser}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {currentTab === 'teachers' && (
            <TeachersPage currentUser={currentUser} />
          )}

          {(currentTab === 'violations_master' ||
            currentTab === 'violations_tahfizh' ||
            currentTab === 'violations_kesantrian') && (
            <ViolationsMasterPage
              currentUser={currentUser}
              initialDivision={
                currentTab === 'violations_tahfizh'
                  ? 'tahfizh'
                  : currentTab === 'violations_kesantrian'
                  ? 'kesantrian'
                  : 'all'
              }
            />
          )}

          {(currentTab === 'records' ||
            currentTab === 'records_tahfizh' ||
            currentTab === 'records_kesantrian') && (
            <RecordsHistoryPage
              currentUser={currentUser}
              settings={settings}
              onSelectStudent={handleSelectStudent}
              initialDivision={
                currentTab === 'records_tahfizh'
                  ? 'tahfizh'
                  : currentTab === 'records_kesantrian'
                  ? 'kesantrian'
                  : 'all'
              }
            />
          )}

          {(currentTab === 'rewards' ||
            currentTab === 'rewards_tahfizh' ||
            currentTab === 'rewards_kesantrian') && (
            <PositiveRecordsPage
              currentUser={currentUser}
              settings={settings}
              onSelectStudent={handleSelectStudent}
              initialDivision={
                currentTab === 'rewards_tahfizh'
                  ? 'tahfizh'
                  : currentTab === 'rewards_kesantrian'
                  ? 'kesantrian'
                  : 'all'
              }
            />
          )}

          {currentTab === 'users' && (
            <UserManagementPage
              currentUser={currentUser}
              onUserUpdated={handleUserUpdated}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              currentUser={currentUser}
              settings={settings}
              onSettingsUpdated={loadSettings}
            />
          )}

          {currentTab === 'audit' && <AuditLogPage />}

          {currentTab === 'parent_portal' && (
            <ParentPortalPage
              settings={settings}
              onBackToLogin={() => setCurrentTab('dashboard')}
              isStaffPreview={true}
            />
          )}
        </main>

        {/* Clean Subtle Footer */}
        <footer className="py-4 px-6 sm:px-8 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c162b]/80 text-xs text-slate-500 dark:text-slate-400 hidden sm:flex items-center justify-between transition-colors duration-200">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {settings?.school_name || "Pesantren Tahfizh Al-Qur'an"} • {settings?.app_name || "Sistem Poin Santri"}
          </p>
          <p className="text-slate-400 dark:text-slate-500 font-medium">
            Tahun Ajaran {settings?.current_academic_year || "2025/2026"} • Sistem Kedisiplinan Terpadu (Tahfizh & Kesantrian)
          </p>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedStudentId(null);
        }}
        onOpenQuickRecord={() => setIsQuickRecordOpen(true)}
      />

      {/* Quick Violation Modal (Floating / Opened Everywhere) */}
      <QuickViolationModal
        isOpen={isQuickRecordOpen}
        onClose={() => setIsQuickRecordOpen(false)}
        currentUser={currentUser}
        initialDivision={currentTab.includes('kesantrian') ? 'kesantrian' : 'tahfizh'}
        onSuccess={() => {}}
        onViewHistory={() => {
          if (currentTab.includes('kesantrian')) {
            setCurrentTab('records_kesantrian');
          } else {
            setCurrentTab('records_tahfizh');
          }
        }}
      />

      {/* Quick Reward Modal (Floating / Catat Kebaikan Everywhere) */}
      <QuickRewardModal
        isOpen={isQuickRewardOpen}
        onClose={() => setIsQuickRewardOpen(false)}
        currentUser={currentUser}
        initialDivision={currentTab.includes('kesantrian') ? 'kesantrian' : 'tahfizh'}
        onSuccess={() => {}}
        onViewHistory={() => {
          if (currentTab.includes('kesantrian')) {
            setCurrentTab('rewards_kesantrian');
          } else {
            setCurrentTab('rewards_tahfizh');
          }
        }}
      />
    </div>
  );
}

export default App;
