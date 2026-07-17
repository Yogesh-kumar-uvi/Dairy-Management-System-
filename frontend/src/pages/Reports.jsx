import { useEffect, useState } from 'react';
import api from '../api.js';

const exportCSV = (rows, filename) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

export default function Reports() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState('');
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    api.get('/customers', { params: { limit: 50, includeInactive: 'true' } }).then((r) => setCustomers(r.data.customers)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/milk-entries/summary/daily', { params: { date } }).then((r) => setDaily(r.data.summary)).catch(() => {});
  }, [date]);

  useEffect(() => {
    api.get('/milk-entries/summary/monthly', { params: { month, customer: customer || undefined } }).then((r) => setMonthly(r.data.summary)).catch(() => {});
  }, [month, customer]);

  const monthlyRows = monthly.map((m) => ({
    code: m.customer.code, name: m.customer.name, entries: m.entries,
    litres: m.litres.toFixed(2), avgFat: m.avgFat.toFixed(2), avgSnf: m.avgSnf.toFixed(2), amount: m.amount.toFixed(2)
  }));

  return (
    <div>
      <h1 className="page-title">Reports</h1>

      <div className="neu-card">
        <h3 style={{ marginBottom: 16 }}>Daily Summary</h3>
        <div className="form-grid">
          <input className="neu-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {daily.length === 0 ? (
          <div className="empty-state">No entries for this date.</div>
        ) : (
          <table className="neu-table">
            <thead>
              <tr><th>Session</th><th>Entries</th><th>Total Litres</th><th>Avg Fat %</th><th>Avg SNF %</th><th>Total Amount (Rs)</th></tr>
            </thead>
            <tbody>
              {daily.map((s) => (
                <tr key={s._id}>
                  <td><b>{s._id}</b></td>
                  <td>{s.entries}</td>
                  <td>{s.litres.toFixed(2)}</td>
                  <td>{s.avgFat.toFixed(2)}</td>
                  <td>{s.avgSnf.toFixed(2)}</td>
                  <td><b>Rs {s.amount.toFixed(2)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="neu-card section-gap">
        <h3 style={{ marginBottom: 16 }}>Monthly Summary (per customer bill)</h3>
        <div className="form-grid">
          <input className="neu-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <select className="neu-input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            <option value="">All customers</option>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.code} - {c.name}</option>)}
          </select>
          <button className="neu-btn small" onClick={() => exportCSV(monthlyRows, `monthly-summary-${month}.csv`)}>Export CSV</button>
          <button className="neu-btn small" onClick={() => window.print()}>Print / PDF</button>
        </div>
        {monthly.length === 0 ? (
          <div className="empty-state">No entries for this month.</div>
        ) : (
          <table className="neu-table">
            <thead>
              <tr><th>Code</th><th>Customer</th><th>Entries</th><th>Litres</th><th>Avg Fat</th><th>Avg SNF</th><th>Amount (Rs)</th></tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m._id}>
                  <td><span className="badge">{m.customer.code}</span></td>
                  <td>{m.customer.name}</td>
                  <td>{m.entries}</td>
                  <td>{m.litres.toFixed(2)}</td>
                  <td>{m.avgFat.toFixed(2)}</td>
                  <td>{m.avgSnf.toFixed(2)}</td>
                  <td><b>Rs {m.amount.toFixed(2)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
