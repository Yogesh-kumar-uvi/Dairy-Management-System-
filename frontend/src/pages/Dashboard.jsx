import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Could not load stats. Is the backend running?'));
  }, []);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      {error && <div className="neu-card empty-state">{error}</div>}
      {!error && !stats && <div className="neu-card empty-state">Loading...</div>}
      {stats && (
        <>
          <div className="stats-grid">
            <div className="neu-card stat-card">
              <div className="stat-label">Active Customers</div>
              <div className="stat-value">{stats.activeCustomers}</div>
            </div>
            <div className="neu-card stat-card">
              <div className="stat-label">Today Morning</div>
              <div className="stat-value">{stats.today.morning.litres} L</div>
              <div className="stat-label">Rs {stats.today.morning.amount.toFixed(2)}</div>
            </div>
            <div className="neu-card stat-card">
              <div className="stat-label">Today Evening</div>
              <div className="stat-value">{stats.today.evening.litres} L</div>
              <div className="stat-label">Rs {stats.today.evening.amount.toFixed(2)}</div>
            </div>
            {user?.role === 'admin' && (
              <div className="neu-card stat-card">
                <div className="stat-label">Total Outstanding (Dues)</div>
                <div className="stat-value">Rs {stats.totalOutstanding?.toFixed(2)}</div>
              </div>
            )}
          </div>
          <div className="neu-card section-gap">
            <div className="flex-row">
              <Link to="/milk-entry"><button className="neu-btn">+ Add Milk Entry</button></Link>
              <Link to="/customers"><button className="neu-btn">+ Add Customer</button></Link>
              {user?.role === 'admin' && <Link to="/reports"><button className="neu-btn">View Reports</button></Link>}
              {user?.role === 'admin' && <Link to="/ledger"><button className="neu-btn">Ledger / Hisab</button></Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
