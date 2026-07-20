import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { disconnectSocket } from '../../services/socket';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/donations', label: 'Donations', icon: '💰' },
  { to: '/chat', label: 'Live Chat', icon: '💬' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-brand-700 text-white flex flex-col">
        <div className="p-6 border-b border-brand-600">
          <h1 className="text-xl font-bold">Fundraising Admin</h1>
          <p className="text-brand-100 text-sm mt-1">{user?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-brand-100 hover:bg-brand-600/50'
                }`
              }
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-600">
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-brand-100 hover:bg-brand-600/50 text-sm">
            🚪 Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
