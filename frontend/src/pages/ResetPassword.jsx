import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api.js';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      alert('Password reset successful. Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="auth-wrap">
      <form className="neu-card auth-card" onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        {error && <div className="error-text">{error}</div>}
        <input className="neu-input" type="password" placeholder="New password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <button className="neu-btn" type="submit">Reset Password</button>
        <Link to="/login">Back to login</Link>
      </form>
    </div>
  );
}
