import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  LayoutDashboard, FilePlus, ClipboardList, Archive, Search, QrCode,
  BarChart3, Users, Settings, LogOut
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/permits/new', label: 'Create Permit', icon: FilePlus },
  { to: '/permits/active', label: 'Active Permits', icon: ClipboardList },
  { to: '/approvals', label: 'Pending Approvals', icon: ClipboardList },
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/qr/scan', label: 'QR Verification', icon: QrCode },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings }
];

const MOBILE_NAV = NAV.slice(0, 5);

export default function AppLayout() {
  const { profile, signOut, sessionKickedOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionKickedOut) navigate('/login');
  }, [sessionKickedOut, navigate]);

  return (
    <div className="min-h-screen bg-bgapp flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col bg-navy text-white shrink-0">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="bg-white rounded-lg px-3 py-2 inline-block mb-1">
            <img src="/branding/dar-logo.png" alt="DAR" className="h-6" />
          </div>
          <div className="text-xs text-slate-300">Project HSE Control Center</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-brand text-white' : 'text-slate-200 hover:bg-white/10'}`
            }>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 text-sm">
          <div className="font-medium">{profile?.full_name}</div>
          <div className="text-xs text-slate-400 mb-2">{profile?.role.replace(/_/g, ' ')}</div>
          <button onClick={async () => { await signOut(); navigate('/login'); }} className="flex items-center gap-2 text-slate-300 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-navy text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="bg-white rounded-lg px-2 py-1.5 inline-block mb-0.5">
              <img src="/branding/dar-logo.png" alt="DAR" className="h-5" />
            </div>
            <div className="text-[11px] text-slate-300">Project HSE Control Center</div>
          </div>
          <button onClick={async () => { await signOut(); navigate('/login'); }} aria-label="Sign out">
            <LogOut size={20} />
          </button>
        </header>

        <main className="flex-1 p-4 pb-20 md:pb-4 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-5 z-10">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 ${isActive ? 'text-brand' : 'text-slate-500'}`
            }>
              <Icon size={20} /> {label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
