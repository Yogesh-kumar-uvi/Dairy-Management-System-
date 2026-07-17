import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const link = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">🥛 Dairy MS</div>
        <NavLink to="/" end className={link}>Dashboard</NavLink>
        <NavLink to="/customers" className={link}>Customers</NavLink>
        <NavLink to="/milk-entry" className={link}>Milk Entry</NavLink>
        {isAdmin && <NavLink to="/ledger" className={link}>Ledger / Hisab</NavLink>}
        {isAdmin && <NavLink to="/rate-chart" className={link}>Rate Chart</NavLink>}
        {isAdmin && <NavLink to="/reports" className={link}>Reports</NavLink>}
        <div className="sidebar-footer">
          <div className="user-chip neu-inset">
            {user?.name} <span className="badge">{user?.role}</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <button className="neu-btn danger" onClick={handleLogout}>⏻ Logout</button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}