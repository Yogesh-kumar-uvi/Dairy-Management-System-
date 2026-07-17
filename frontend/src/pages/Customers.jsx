import { useEffect, useState } from 'react';
import api from '../api.js';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { name: '', code: '', village: '', phone: '' };

export default function Customers() {
  const { user } = useAuth();
  const [data, setData] = useState({ customers: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    api.get('/customers', { params: { search, page, limit: 10 } })
      .then((r) => setData(r.data))
      .catch(() => {});

  useEffect(() => { load(); }, [search, page]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.put(`/customers/${editing}`, form);
      else await api.post('/customers', form);
      setForm(emptyForm);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save customer');
    }
  };

  const startEdit = (c) => {
    setEditing(c._id);
    setForm({ name: c.name, code: c.code, village: c.village || '', phone: c.phone || '' });
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${confirmDelete._id}`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">Customers</h1>

      <form className="neu-card" onSubmit={handleSubmit}>
        {error && <div className="error-text">{error}</div>}
        <div className="form-grid">
          <input className="neu-input" name="name" placeholder="Name *" value={form.name} onChange={handleChange} required />
          <input className="neu-input" name="code" placeholder="Code (auto if blank)" value={form.code} onChange={handleChange} disabled={!!editing} title={editing ? 'Customer code is locked and cannot be changed' : ''} />
          <input className="neu-input" name="village" placeholder="Village" value={form.village} onChange={handleChange} />
          <input className="neu-input" name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
        </div>
        <div className="flex-row">
          <button className="neu-btn" type="submit">{editing ? 'Update Customer' : '+ Add Customer'}</button>
          {editing && (
            <button className="neu-btn small" type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="neu-card section-gap">
        <input className="neu-input" placeholder="Search by name, code or village..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ marginBottom: 16 }} />
        {data.customers.length === 0 ? (
          <div className="empty-state">No customers found.</div>
        ) : (
          <table className="neu-table">
            <thead>
              <tr><th>Code</th><th>Name</th><th>Village</th><th>Phone</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr key={c._id}>
                  <td><span className="badge">{c.code}</span></td>
                  <td>{c.name}</td>
                  <td>{c.village || '-'}</td>
                  <td>{c.phone || '-'}</td>
                  <td>{new Date(c.joiningDate).toLocaleDateString()}</td>
                  <td>
                    <div className="flex-row">
                      <button className="neu-btn small" onClick={() => startEdit(c)}>Edit</button>
                      {user?.role === 'admin' && (
                        <button className="neu-btn danger" onClick={() => setConfirmDelete(c)}>Delete</button>
                      )}
                    </div>
                  </td>
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

      {confirmDelete && (
        <Modal title="Delete customer?" onClose={() => setConfirmDelete(null)}>
          <p style={{ marginBottom: 16, fontSize: 14 }}>
            <b>{confirmDelete.name} ({confirmDelete.code})</b> will be deactivated. Milk records and ledger history will be preserved.
          </p>
          <div className="flex-row">
            <button className="neu-btn danger" onClick={handleDelete}>Yes, deactivate</button>
            <button className="neu-btn small" onClick={() => setConfirmDelete(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
