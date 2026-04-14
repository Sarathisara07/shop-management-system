import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight } from 'lucide-react';
import { API_URL } from '../config';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Reset OTP has been sent to your email.');
        setTimeout(() => navigate('/reset-password'), 2000);
      } else {
        setError(data.message || 'Server rejected the request.');
      }
    } catch (err) {
      setError('Network error: Could not reach the server. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-enter">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="logo-glow">
            <KeyRound size={40} />
          </div>
          <h1>Reset Password</h1>
          <p className="text-muted">Enter your email to receive an OTP</p>
        </div>

        {error && <div className="error-alert">{error}</div>}
        {message && <div className="success-alert">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label><Mail size={16} /> Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
            />
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send OTP'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          Remembered? <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
