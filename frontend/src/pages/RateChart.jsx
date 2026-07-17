import { useEffect, useState } from 'react';
import api from '../api.js';

const emptyRow = { fatMin: '', fatMax: '', snfMin: '', snfMax: '', rate: '', milkType: 'any' };

export default function RateChart() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyRow);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/rate-chart').then((r) => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.put(`/rate-chart/${editing}`, form);
      else await api.post('/rate-chart', form);
      setForm(emptyRow);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  };

  const startEdit = (r) => {
    setEditing(r._id);
    setForm({ fatMin: r.fatMin, fatMax: r.fatMax, snfMin: r.snfMin, snfMax: r.snfMax, rate: r.rate, milkType: r.milkType });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rate chart row?')) return;
    await api.delete(`/rate-chart/${id}`);
    await load();
  };

  return (
    <div>
      <h1 className="page-title">Fat-SNF Rate Chart</h1>

      <form className="neu-card" onSubmit={handleSubmit}>
        {error && <div className="error-text">{error}</div>}
        <div className="form-grid">
          <input className="neu-input" type="number" step="0.1" name="fatMin" placeholder="Fat Min *" value={form.fatMin} onChange={handleChange} required />
          <input className="neu-input" type="number" step="0.1" name="fatMax" placeholder="Fat Max *" value={form.fatMax} onChange={handleChange} required />
          <input className="neu-input" type="number" step="0.1" name="snfMin" placeholder="SNF Min *" value={form.snfMin} onChange={handleChange} required />
          <input className="neu-input" type="number" step="0.1" name="snfMax" placeholder="SNF Max *" value={form.snfMax} onChange={handleChange} required />
          <input className="neu-input" type="number" step="0.01" name="rate" placeholder="Rate Rs/L *" value={form.rate} onChange={handleChange} required />
          <select className="neu-input" name="milkType" value={form.milkType} onChange={handleChange}>
            <option value="any">Any</option>
            <option value="cow">Cow</option>
            <option value="buffalo">Buffalo</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className="flex-row">
          <button className="neu-btn" type="submit">{editing ? 'Update Row' : '+ Add Row'}</button>
          {editing && <button className="neu-btn small" type="button" onClick={() => { setEditing(null); setForm(emptyRow); }}>Cancel</button>}
        </div>
      </form>

      <div className="neu-card section-gap">
        {rows.length === 0 ? (
          <div className="empty-state">No rate chart rows yet. Milk entry rate will need manual input until you add rows.</div>
        ) : (
          <table className="neu-table">
            <thead>
              <tr><th>Fat Range</th><th>SNF Range</th><th>Milk Type</th><th>Rate (Rs/L)</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>{r.fatMin} - {r.fatMax}</td>
                  <td>{r.snfMin} - {r.snfMax}</td>
                  <td>{r.milkType}</td>
                  <td><b>Rs {r.rate}</b></td>
                  <td>
                    <div className="flex-row">
                      <button className="neu-btn small" onClick={() => startEdit(r)}>Edit</button>
                      <button className="neu-btn danger" onClick={() => handleDelete(r._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
