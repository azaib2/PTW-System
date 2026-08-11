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
              <Route path="archive" element={<Placeholder title="Permit Archive (Stage 7)" />} />
              <Route path="search" element={<Placeholder title="Search (Stage 7)" />} />
              <Route path="qr/scan" element={<Placeholder title="QR Verification (Stage 6)" />} />
              <Route path="reports" element={<Placeholder title="Reports (Stage 7)" />} />
              <Route path="users" element={<Placeholder title="Users (Stage 1 admin CRUD — pending)" />} />
              <Route path="settings" element={<Placeholder title="Settings (Stage 1 admin CRUD — pending)" />} />
            </Route>
            <Route path="/verify/:permitId" element={<Placeholder title="Public QR Verification (Stage 6)" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
