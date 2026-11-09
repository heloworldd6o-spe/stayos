import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import RoomsPage from './pages/RoomsPage';
import BedsPage from './pages/BedsPage';
import ResidentsPage from './pages/ResidentsPage';
import CheckInWizardPage from './pages/CheckInWizardPage';
import InvoicesPage from './pages/InvoicesPage';
import PaymentsPage from './pages/PaymentsPage';
import ExpensesPage from './pages/ExpensesPage';
import FoodManagementPage from './pages/FoodManagementPage';
import ChefDashboardPage from './pages/ChefDashboardPage';
import ComplaintsPage from './pages/ComplaintsPage';
import StaffPage from './pages/StaffPage';
import MaintenancePage from './pages/MaintenancePage';
import VisitorsPage from './pages/VisitorsPage';
import NoticesPage from './pages/NoticesPage';
import ReportsPage from './pages/ReportsPage';
import ResidentPortalPage from './pages/ResidentPortalPage';
import SuperAdminPage from './pages/SuperAdminPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingWizard from './pages/OnboardingWizard';

export default function App() {
  const { user, token, loading, properties, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [prefilledBed, setPrefilledBed] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-2xl animate-pulse shadow-lg shadow-emerald-500/30">
          S
        </div>
        <div className="mt-4 text-sm font-semibold text-slate-400">Loading StayOS Platform...</div>
      </div>
    );
  }

  // Unauthenticated user: Show Landing Page or Login Modal
  if (!token || !user) {
    if (authMode) {
      return (
        <LoginPage
          initialMode={authMode}
          onBackToLanding={() => setAuthMode(null)}
        />
      );
    }
    return (
      <LandingPage
        onLogin={() => setAuthMode('login')}
        onGetStarted={() => setAuthMode('register')}
        onSelectRole={(role) => switchRole(role)}
      />
    );
  }

  // Resident role has their specialized mobile-first portal
  if (user.role === 'resident') {
    return (
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <ResidentPortalPage activeTab={activeTab} initialTab={activeTab} onNavigateTab={setActiveTab} />
      </AppLayout>
    );
  }

  // Chef or Kitchen Staff default to KDS
  if ((user.role === 'chef' || user.role === 'kitchen_staff') && activeTab === 'dashboard') {
    return (
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'food' ? <FoodManagementPage /> : <ChefDashboardPage />}
      </AppLayout>
    );
  }

  // Onboarding wizard for new accounts with 0 properties
  if (showOnboarding || (properties && properties.length === 0 && user.role === 'owner')) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'residents':
        return <ResidentsPage onNavigate={setActiveTab} onStartCheckIn={() => { setPrefilledBed(null); setActiveTab('checkin'); }} />;
      case 'rooms':
        return <RoomsPage onNavigate={setActiveTab} onAllocateBed={(bed) => { setPrefilledBed(bed); setActiveTab('checkin'); }} />;
      case 'beds':
        return <BedsPage onNavigate={setActiveTab} onAllocateBed={(bed) => { setPrefilledBed(bed); setActiveTab('checkin'); }} />;
      case 'checkin':
        return <CheckInWizardPage prefilledBed={prefilledBed} onComplete={() => { setPrefilledBed(null); setActiveTab('residents'); }} />;
      case 'invoices':
        return <InvoicesPage onNavigate={setActiveTab} />;
      case 'payments':
        return <PaymentsPage onNavigate={setActiveTab} />;
      case 'expenses':
        return <ExpensesPage onNavigate={setActiveTab} />;
      case 'reports':
        return <ReportsPage onNavigate={setActiveTab} />;
      case 'food':
        return <FoodManagementPage onNavigate={setActiveTab} />;
      case 'chef':
        return <ChefDashboardPage onNavigate={setActiveTab} />;
      case 'complaints':
        return <ComplaintsPage onNavigate={setActiveTab} />;
      case 'maintenance':
        return <MaintenancePage onNavigate={setActiveTab} />;
      case 'staff':
        return <StaffPage onNavigate={setActiveTab} />;
      case 'visitors':
        return <VisitorsPage onNavigate={setActiveTab} />;
      case 'notices':
        return <NoticesPage onNavigate={setActiveTab} />;
      case 'properties':
        return <PropertiesPage onNavigate={setActiveTab} />;
      case 'settings':
        return <SettingsPage onNavigate={setActiveTab} />;
      case 'superadmin':
        return <SuperAdminPage onNavigate={setActiveTab} />;
      default:
        return <DashboardPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderTabContent()}
    </AppLayout>
  );
}
