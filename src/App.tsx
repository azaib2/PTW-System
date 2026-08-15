import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import LoginPage from '@/features/auth/LoginPage';
import AppLayout from '@/layouts/AppLayout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import CreatePermitPage from '@/features/permits/CreatePermitPage';
import PermitDetailPage from '@/features/permits/PermitDetailPage';
import PermitListPage from '@/features/permits/PermitListPage';
import LiftingPlanFormPage from '@/features/lifting/LiftingPlanFormPage';
import LiftingPlanDetailPage from '@/features/lifting/LiftingPlanDetailPage';
import CraneChecklistPage from '@/features/lifting/CraneChecklistPage';
import SitePreparationPage from '@/features/lifting/SitePreparationPage';
import RiggingVerificationPage from '@/features/lifting/RiggingVerificationPage';
import CompetencyPage from '@/features/lifting/CompetencyPage';
import FieldVerificationPage from '@/features/lifting/FieldVerificationPage';
import QrScannerPage from '@/features/qr/QrScannerPage';
import PublicVerifyPage from '@/features/qr/PublicVerifyPage';
import LocationQrManagerPage from '@/features/qr/LocationQrManagerPage';
import SearchPage from '@/features/search/SearchPage';
import ArchivePage from '@/features/archive/ArchivePage';
import ReportsPage from '@/features/reports/ReportsPage';
import UsersPage from '@/features/users/UsersPage';
import SettingsPage from '@/features/settings/SettingsPage';

const queryClient = new QueryClient();

function Placeholder({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h1 className="text-lg font-bold text-navy mb-2">{title}</h1>
      <p className="text-sm text-slate-500">
        NOT IMPLEMENTED YET — scheduled for a later build stage per the staged development plan
        (see README.md → Development Stages). This route is wired into navigation but the feature
        itself has not been built, so nothing here is a placeholder pretending to work.
      </p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="permits/new" element={<CreatePermitPage />} />
              <Route path="permits/:id" element={<PermitDetailPage />} />
              <Route path="permits/active" element={
                <PermitListPage title="Active Permits" statuses={['approved', 'active', 'expiring_soon', 'suspended']} />
              } />
              <Route path="approvals" element={
                <PermitListPage title="Pending Approvals" statuses={['submitted', 'under_review']} />
              } />
              <Route path="lifting/plans/new" element={<LiftingPlanFormPage />} />
              <Route path="lifting/plans/:id" element={<LiftingPlanDetailPage />} />
              <Route path="lifting/crane-checklist" element={<CraneChecklistPage />} />
              <Route path="lifting/site-preparation" element={<SitePreparationPage />} />
              <Route path="lifting/rigging" element={<RiggingVerificationPage />} />
              <Route path="lifting/competency/:permitId" element={<CompetencyPage />} />
              <Route path="lifting/field-verification/:permitId" element={<FieldVerificationPage />} />
              <Route path="archive" element={<ArchivePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="qr/scan" element={<QrScannerPage />} />
              <Route path="qr/locations" element={<LocationQrManagerPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/verify/:permitId" element={<PublicVerifyPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
