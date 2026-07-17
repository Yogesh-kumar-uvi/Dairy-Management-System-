import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const emptyForm = { customer: '', session: 'morning', milkType: 'cow', fat: '', snf: '', clr: '', rate: '', quantity: '', date: todayStr(), time: nowTime() };

export default function MilkEntry() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [data, setData] = useState({ entries: [], total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ customer: '', from: '', to: '', session: '', milkType: '' });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCustomers = () => api.get('/customers', { params: { limit: 50 } }).then((r) => setCustomers(r.data.customers)).catch(() => {});
  const loadEntries = () => api.get('/milk-entries', { params: { ...filters, page, limit: 15 } }).then((r) => setData(r.data)).catch(() => {});

  useEffect(() => { loadCustomers(); }, []);
  useEffect(() => { loadEntries(); }, [filters, page]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Auto-fill rate from Fat-SNF rate chart
  const autoFillRate = async () => {
    if (!form.fat || !form.snf) return;
    try {
      const { data: d } = await api.get('/rate-chart/lookup', { params: { fat: form.fat, snf: form.snf, milkType: form.milkType } });
      if (d.rate != null) setForm((f) => ({ ...f, rate: d.rate }));
    } catch { /* manual rate entry allowed */ }
  };

  const liveAmount = form.rate && form.quantity ? (Number(form.rate) * Number(form.quantity)).toFixed(2) : '0.00';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/milk-entries', { ...form, clr: form.clr || undefined, rate: form.rate || undefined });
      setForm({ ...emptyForm, session: form.session, date: form.date, milkType: form.milkType });
      await loadEntries();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await api.delete(`/milk-entries/${id}`); await loadEntries(); }
    catch (err) { setError(err.response?.data?.message || 'Delete failed'); }
  };

  const setFilter = (e) => { setFilters({ ...filters, [e.target.name]: e.target.value }); setPage(1); };

  return (
    <div>
      <h1 className="page-title">Milk Collection Entry</h1>

      <form className="neu-card" onSubmit={handleSubmit}>
        {error && <div className="error-text">{error}</div>}
        <div className="form-grid">
          <select className="neu-input" name="customer" value={form.customer} onChange={handleChange} required>
            <option value="">Select customer *</option>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.code} - {c.name}</option>)}
          </select>
          <select className="neu-input" name="session" value={form.session} onChange={handleChange}>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
          <select className="neu-input" name="milkType" value={form.milkType} onChange={handleChange}>
            <option value="cow">Cow</option>
            <option value="buffalo">Buffalo</option>
            <option value="mixed">Mixed</option>
          </select>
          <input className="neu-input" type="number" step="0.01" min="0" max="15" name="fat" placeholder="Fat % *" value={form.fat} onChange={handleChange} onBlur={autoFillRate} required />
          <input className="neu-input" type="number" step="0.01" min="0" max="15" name="snf" placeholder="SNF % *" value={form.snf} onChange={handleChange} onBlur={autoFillRate} required />
          <input className="neu-input" type="number" step="0.1" min="0" max="40" name="clr" placeholder="CLR" value={form.clr} onChange={handleChange} />
          <input className="neu-input" type="number" step="0.01" min="0" name="rate" placeholder="Rate Rs/L (auto/manual)" value={form.rate} onChange={handleChange} />
          <input className="neu-input" type="number" step="0.1" min="0.1" name="quantity" placeholder="Quantity (L) *" value={form.quantity} onChange={handleChange} required />
          <input className="neu-input" type="date" name="date" value={form.date} onChange={handleChange} required />
          <input className="neu-input" type="time" name="time" value={form.time} onChange={handleChange} />
        </div>
        <div className="flex-row">
          <button className="neu-btn" type="submit" disabled={loading}>{loading ? 'Saving...' : '+ Add Entry'}</button>
          <div className="neu-inset amount-preview">Amount: Rs {liveAmount}</div>
        </div>
      </form>

      <div className="neu-card section-gap">
        <div className="form-grid">
          <select className="neu-input" name="customer" value={filters.customer} onChange={setFilter}>
            <option value="">All customers</option>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.code} - {c.name}</option>)}
          </select>
          <input className="neu-input" type="date" name="from" value={filters.from} onChange={setFilter} />
          <input className="neu-input" type="date" name="to" value={filters.to} onChange={setFilter} />
          <select className="neu-input" name="session" value={filters.session} onChange={setFilter}>
            <option value="">All sessions</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
          <select className="neu-input" name="milkType" value={filters.milkType} onChange={setFilter}>
            <option value="">All types</option>
            <option value="cow">Cow</option>
            <option value="buffalo">Buffalo</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        {data.entries.length === 0 ? (
          <div className="empty-state">No entries found.</div>
        ) : (
          <table className="neu-table">
            <thead>
              <tr><th>Date</th><th>Time</th><th>Customer</th><th>Session</th><th>Type</th><th>Fat</th><th>SNF</th><th>CLR</th><th>Qty (L)</th><th>Rate</th><th>Amount</th>{user?.role === 'admin' && <th></th>}</tr>
            </thead>
            <tbody>
              {data.entries.map((r) => (
                <tr key={r._id}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{r.time || '-'}</td>
                  <td>{r.customer ? `${r.customer.code} - ${r.customer.name}` : '-'}</td>
                  <td>{r.session}</td>
                  <td>{r.milkType}</td>
                  <td>{r.fat}</td>
                  <td>{r.snf}</td>
                  <td>{r.clr ?? '-'}</td>
                  <td>{r.quantity}</td>
                  <td>{r.rate}</td>
                  <td><b>Rs {r.amount}</b></td>
                  {user?.role === 'admin' && (
                    <td><button className="neu-btn danger" onClick={() => handleDelete(r._id)}>Delete</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pagination">
          <button className="neu-btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>Page {data.page} of {data.pages || 1} ({data.total} total)</span>
          <button className="neu-btn small" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
