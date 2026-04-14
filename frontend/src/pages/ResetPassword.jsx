import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config';
import './Auth.css';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!email || !otp) {
      setError('Please enter both Email and OTP');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsVerified(true);
        setMessage('OTP Verified! Now enter your new password.');
        setError('');
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Network error. Could not reach server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset successful!');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-enter">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="logo-glow">
            <ShieldCheck size={40} />
          </div>
          <h1>{isVerified ? 'Set New Password' : 'Verify OTP'}</h1>
          <p className="text-muted">
            {isVerified 
              ? 'Enter a strong new password for your account' 
              : 'Enter the code sent to your email to continue'}
          </p>
        </div>

        {error && <div className="error-alert">{error}</div>}
        {message && <div className="success-alert">{message}</div>}

        <form onSubmit={isVerified ? handleSubmit : handleVerifyOtp} className="auth-form">
          <div className="input-group">
            <label><Mail size={16} /> Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              required 
              disabled={isVerified}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Confirm email"
            />
          </div>

          <div className="input-group">
            <label><CheckCircle2 size={16} /> OTP Code {isVerified && <span className="text-success" style={{fontSize: '0.8rem'}}>(Verified)</span>}</label>
            <input 
              type="text" 
              className="input-field" 
              required 
              disabled={isVerified}
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
            />
          </div>

          {isVerified && (
            <div className="input-group animate-slide-down">
              <label><Lock size={16} /> New Password</label>
              <input 
                type="password" 
                className="input-field" 
                required 
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          )}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading 
              ? (isVerified ? 'Updating...' : 'Verifying...') 
              : (isVerified ? 'Update Password' : 'Verify OTP')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
