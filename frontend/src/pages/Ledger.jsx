import { useEffect, useState } from 'react';
import api from '../api.js';

const emptyPayment = { amount: '', mode: 'cash', date: new Date().toISOString().slice(0, 10), remarks: '' };

export default function Ledger() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState('');
  const [ledger, setLedger] = useState(null);
  const [outstanding, setOutstanding] = useState([]);
  const [payment, setPayment] = useState(emptyPayment);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/customers', { params: { limit: 50, includeInactive: 'true' } }).then((r) => setCustomers(r.data.customers)).catch(() => {});
    loadOutstanding();
  }, []);

  const loadOutstanding = () => api.get('/payments/outstanding/all').then((r) => setOutstanding(r.data)).catch(() => {});
  const loadLedger = (id) => api.get(`/payments/ledger/${id}`).then((r) => setLedger(r.data)).catch(() => {});

  useEffect(() => { if (selected) loadLedger(selected); else setLedger(null); }, [selected]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/payments', { ...payment, customer: selected });
      setPayment(emptyPayment);
      await Promise.all([loadLedger(selected), loadOutstanding()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    }
  };

  return (
    <div>
      <h1 className="page-title">Ledger / Hisab-Kitab</h1>

      <div className="neu-card">
        <div className="form-grid">
          <select className="neu-input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select customer for ledger...</option>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.code} - {c.name}{c.isActive ? '' : ' (inactive)'}</option>)}
          </select>
          {ledger && (
            <div className="neu-inset amount-preview">
              Balance Due: Rs {ledger.balance.toFixed(2)}
            </div>
          )}
          {selected && <button className="neu-btn small" type="button" onClick={() => window.print()}>Print Statement</button>}
        </div>
      </div>

      {selected && (
        <form className="neu-card section-gap" onSubmit={handlePayment}>
          <h3 style={{ marginBottom: 16 }}>Record Payment</h3>
          {error && <div className="error-text">{error}</div>}
          <div className="form-grid">
            <input className="neu-input" type="number" step="0.01" min="0.01" placeholder="Amount Rs *" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} required />
            <select className="neu-input" value={payment.mode} onChange={(e) => setPayment({ ...payment, mode: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
            </select>
            <input className="neu-input" type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} />
            <input className="neu-input" placeholder="Remarks" value={payment.remarks} onChange={(e) => setPayment({ ...payment, remarks: e.target.value })} />
          </div>
          <button className="neu-btn" type="submit">+ Record Payment</button>
        </form>
      )}

      {ledger && (
        <div className="neu-card section-gap">
          <h3 style={{ marginBottom: 16 }}>Statement</h3>
          {ledger.rows.length === 0 ? (
            <div className="empty-state">No transactions yet.</div>
          ) : (
            <table className="neu-table">
              <thead>
                <tr><th>Date</th><th>Description</th><th>Milk Credit (Rs)</th><th>Payment (Rs)</th><th>Running Balance (Rs)</th></tr>
              </thead>
              <tbody>
                {ledger.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td>{r.description}</td>
                    <td>{r.credit ? r.credit.toFixed(2) : '-'}</td>
                    <td>{r.debit ? r.debit.toFixed(2) : '-'}</td>
                    <td><b>{r.balance.toFixed(2)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="neu-card section-gap">
        <h3 style={{ marginBottom: 16 }}>Outstanding Dues (highest first)</h3>
        {outstanding.length === 0 ? (
          <div className="empty-state">No outstanding dues.</div>
        ) : (
          <table className="neu-table">
            <thead>
              <tr><th>Code</th><th>Customer</th><th>Village</th><th>Milk Total (Rs)</th><th>Paid (Rs)</th><th>Due (Rs)</th></tr>
            </thead>
            <tbody>
              {outstanding.map((o) => (
                <tr key={o.customer._id}>
                  <td><span className="badge">{o.customer.code}</span></td>
                  <td>{o.customer.name}</td>
                  <td>{o.customer.village || '-'}</td>
                  <td>{o.milkTotal.toFixed(2)}</td>
                  <td>{o.paid.toFixed(2)}</td>
                  <td><b style={{ color: 'var(--danger)' }}>{o.due.toFixed(2)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
