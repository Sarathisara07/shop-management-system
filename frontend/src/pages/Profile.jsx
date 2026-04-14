import { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Lock, EyeOff, Eye, Save, Camera, Trash2,
  CheckCircle, AlertCircle, ShieldCheck, Calendar, Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../config';
import './Profile.css';

const Profile = () => {
  const { user, login } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  // Profile form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [shopLogo, setShopLogo] = useState('');
  const [logoPreview, setLogoPreview] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI state
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalMsg, setGlobalMsg] = useState(null); // { type: 'success'|'error', text }
  const [memberSince, setMemberSince] = useState('');

  // Load current profile
  useEffect(() => {
    fetch(`${API_URL}/api/auth/profile`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setUsername(data.username || '');
        setEmail(data.email || '');
        setShopLogo(data.shopLogo || '');
        setLogoPreview(data.shopLogo || '');
        if (data.createdAt) {
          setMemberSince(new Date(data.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'long', day: 'numeric'
          }));
        }
      })
      .catch(() => {
        setUsername(user.username || '');
        setEmail(user.email || '');
      });
  }, []);

  // Handle logo file selection
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Image must be under 2MB' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      setShopLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setShopLogo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Save All
  const handleSaveAllChanges = async () => {
    setGlobalLoading(true);
    setGlobalMsg(null);
    let hasError = false;
    let successCount = 0;

    // 1. Save Profile
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ username, email, shopLogo })
      });
      const data = await res.json();
      if (res.ok) {
        login({ ...user, ...data });
        successCount++;
      } else {
        hasError = true;
        setGlobalMsg({ type: 'error', text: data.message });
      }
    } catch {
      hasError = true;
      setGlobalMsg({ type: 'error', text: 'Network error saving profile.' });
    }

    // 2. Save Password (if fields are filled)
    const isPasswordUpdating = currentPassword || newPassword || confirmNewPassword;
    
    if (isPasswordUpdating && !hasError) {
      if (!currentPassword) {
        setGlobalMsg({ type: 'error', text: 'Current password required' });
        hasError = true;
      } else if (newPassword !== confirmNewPassword) {
        setGlobalMsg({ type: 'error', text: t('passwordMismatch') });
        hasError = true;
      } else if (newPassword.length < 6) {
        setGlobalMsg({ type: 'error', text: t('passwordTooShort') });
        hasError = true;
      } else {
        try {
          const res = await fetch(`${API_URL}/api/auth/change-password`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
          });
          const data = await res.json();
          if (res.ok) {
            successCount++;
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
          } else {
            hasError = true;
            setGlobalMsg({ type: 'error', text: data.message });
          }
        } catch {
          hasError = true;
          setGlobalMsg({ type: 'error', text: 'Network error saving password.' });
        }
      }
    }

    setGlobalLoading(false);

    if (!hasError && successCount > 0) {
      setGlobalMsg({ type: 'success', text: isPasswordUpdating ? 'Profile and Password updated successfully!' : t('profileUpdated') });
    }
    
    setTimeout(() => setGlobalMsg(null), 5000);
  };

  // Password strength
  const getPasswordStrength = (pw) => {
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Weak', color: '#ef4444', pct: 33 };
    if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
      return { label: 'Medium', color: '#f59e0b', pct: 66 };
    return { label: 'Strong', color: '#10b981', pct: 100 };
  };
  const strength = getPasswordStrength(newPassword);

  return (
    <div className="profile-container animate-enter">
      <header className="page-header">
        <h1>{t('profileSettings')}</h1>
        <p className="text-muted">{t('profileSubtitle')}</p>
      </header>

      <div className="profile-grid">
        {/* ===== LEFT COLUMN ===== */}
        <div className="profile-left">

          {/* Shop Logo Card */}
          <div className="profile-card glass-panel">
            <div className="card-header">
              <Store size={20} className="card-icon" />
              <h2>{t('shopIdentity')}</h2>
            </div>
            <p className="text-muted card-desc">{t('shopLogoDesc')}</p>

            <div className="logo-upload-area">
              <div className="logo-preview-circle" onClick={() => fileInputRef.current?.click()}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Shop Logo" className="logo-img" />
                ) : (
                  <div className="logo-placeholder">
                    <Camera size={36} />
                    <span>Click to upload</span>
                  </div>
                )}
                <div className="logo-overlay">
                  <Camera size={24} />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />

              <div className="logo-actions">
                <button className="btn-logo-upload" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={16} /> {t('uploadLogo')}
                </button>
                {logoPreview && (
                  <button className="btn-logo-remove" onClick={handleRemoveLogo}>
                    <Trash2 size={16} /> {t('removeLogo')}
                  </button>
                )}
              </div>
              <p className="logo-hint">{t('logoHint')}</p>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="profile-card glass-panel">
            <div className="card-header">
              <ShieldCheck size={20} className="card-icon" />
              <h2>{t('dangerZone')}</h2>
            </div>
            <div className="account-info-list">
              <div className="account-info-row">
                <div className="ai-icon"><User size={16} /></div>
                <div>
                  <p className="ai-label">{t('newUsername')}</p>
                  <p className="ai-value">{user?.username}</p>
                </div>
              </div>
              <div className="account-info-row">
                <div className="ai-icon"><Mail size={16} /></div>
                <div>
                  <p className="ai-label">{t('accountEmail')}</p>
                  <p className="ai-value">{user?.email}</p>
                </div>
              </div>
              {memberSince && (
                <div className="account-info-row">
                  <div className="ai-icon"><Calendar size={16} /></div>
                  <div>
                    <p className="ai-label">{t('memberSince')}</p>
                    <p className="ai-value">{memberSince}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div className="profile-right">

          {/* Personal Info Card */}
          <div className="profile-card glass-panel">
            <div className="card-header">
              <User size={20} className="card-icon" />
              <h2>{t('personalInfo')}</h2>
            </div>

            <div className="form-group">
              <label className="form-label">
                <User size={15} /> {t('newUsername')}
              </label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. ShopOwner"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail size={15} /> {t('emailAddress')}
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. owner@gmail.com"
              />
            </div>
          </div>

          {/* Change Password Card */}
          <div className="profile-card glass-panel">
            <div className="card-header">
              <Lock size={20} className="card-icon" />
              <h2>{t('changePassword')}</h2>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} /> {t('currentPassword')}
              </label>
              <div className="pw-input-wrap">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="input-field"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder={t('enterCurrentPassword')}
                />
                <button className="pw-toggle" onClick={() => setShowCurrent(v => !v)}>
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} /> {t('newPassword')}
              </label>
              <div className="pw-input-wrap">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="input-field"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('enterNewPassword')}
                />
                <button className="pw-toggle" onClick={() => setShowNew(v => !v)}>
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Password strength bar */}
              {strength && (
                <div className="strength-bar-wrap">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{ width: `${strength.pct}%`, background: strength.color }}
                    ></div>
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} /> {t('confirmNewPassword')}
              </label>
              <div className="pw-input-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="input-field"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder={t('confirmPasswordPlaceholder')}
                />
                <button className="pw-toggle" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Match indicator */}
              {confirmNewPassword && (
                <p className="match-indicator" style={{
                  color: newPassword === confirmNewPassword ? '#10b981' : '#ef4444'
                }}>
                  {newPassword === confirmNewPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ===== GLOBAL SAVE ACTIONS ===== */}
      <div className="profile-actions-footer">
        {globalMsg && (
          <div className={`profile-alert ${globalMsg.type}`} style={{width: '100%', maxWidth: '500px', justifyContent: 'center'}}>
            {globalMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{globalMsg.text}</span>
          </div>
        )}
        <button 
           className="profile-btn-global" 
           onClick={handleSaveAllChanges} 
           disabled={globalLoading}
        >
          {globalLoading ? <span className="btn-spinner"></span> : <Save size={20} />}
          {globalLoading ? t('savingAllChanges') : t('saveAllChanges')}
        </button>
      </div>
    </div>
  );
};

export default Profile;
