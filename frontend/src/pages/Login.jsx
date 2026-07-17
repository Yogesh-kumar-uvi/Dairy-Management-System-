import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, bootstrap } = useAuth();
  const navigate = useNavigate();
  const [isSetup, setIsSetup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSetup) await bootstrap(form.name, form.email, form.password);
      else await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="neu-card auth-card" onSubmit={handleSubmit}>
        <h2>🥛 Dairy MS</h2>
        {error && <div className="error-text">{error}</div>}
        {isSetup && (
          <input className="neu-input" name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
        )}
        <input className="neu-input" type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input className="neu-input" type="password" name="password" placeholder="Password (min 8 chars)" value={form.password} onChange={handleChange} required minLength={8} />
        <button className="neu-btn" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isSetup ? 'Create Admin Account' : 'Login'}
        </button>
        {!isSetup && <Link to="/forgot-password">Forgot password?</Link>}
        <a href="#" onClick={(e) => { e.preventDefault(); setIsSetup(!isSetup); setError(''); }}>
          {isSetup ? 'Back to login' : 'First time setup? Create admin'}
        </a>
      </form>
    </div>
  );
}
