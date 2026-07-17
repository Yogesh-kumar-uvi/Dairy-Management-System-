import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="auth-wrap">
      <form className="neu-card auth-card" onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        {message && <div className="success-text">{message}</div>}
        {error && <div className="error-text">{error}</div>}
        <input className="neu-input" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className="neu-btn" type="submit">Send Reset Link</button>
        <Link to="/login">Back to login</Link>
      </form>
    </div>
  );
}
