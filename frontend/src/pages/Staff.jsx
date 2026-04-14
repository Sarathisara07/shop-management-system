import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Users, UserPlus, Shield, User as UserIcon, Trash2, RefreshCcw, Lock } from 'lucide-react';
import { API_URL } from '../config';
import './Staff.css';

const Staff = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();

  // Form state for new staff
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'cashier'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/add-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddForm(false);
        setFormData({ username: '', email: '', password: '', role: 'cashier' });
        fetchUsers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error creating staff account');
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'cashier' : 'admin';
    if (!window.confirm(`Change role to ${newRole}?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      alert('Error updating role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this staff account?')) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      alert('Error deleting user');
    }
  };

  const handleResetPassword = async (userId, username) => {
    const newPassword = window.prompt(`Enter new password for ${username}:`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        alert('Password reset successfully!');
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      alert('Error resetting password');
    }
  };

  return (
    <div className="staff-container animate-enter">
      <div className="page-header">
        <div className="header-title">
          <Users size={28} className="text-gradient" />
          <h1>Staff Management</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus size={18} />
          {showAddForm ? 'Close Form' : 'Add New Staff'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-staff-form glass-panel animate-slide-down">
          <h3>Create Staff Account</h3>
          <form onSubmit={handleCreateStaff}>
            <div className="form-grid">
              <div className="input-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required 
                />
              </div>
              <div className="input-group">
                <label>Email (Optional but required for OTP reset)</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required 
                />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select 
                  className="input-field"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="cashier">Cashier (Worker)</option>
                  <option value="admin">Admin (Owner)</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Create Account</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <RefreshCcw className="spinning" />
          <p>Loading staff list...</p>
        </div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <div className="staff-list glass-panel">
          <table className="staff-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar-small">
                        {u.shopLogo ? <img src={u.shopLogo} alt="" /> : <UserIcon size={14} />}
                      </div>
                      <span>{u.username} {u._id === currentUser._id && "(You)"}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge-large ${u.role === 'admin' ? 'admin' : 'cashier'}`}>
                      {u.role === 'admin' ? <Shield size={12} /> : null}
                      {u.role || 'admin'}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      {u._id !== currentUser._id && (
                        <>
                          <button 
                            className="btn-icon" 
                            title="Toggle Role" 
                            onClick={() => handleToggleRole(u._id, u.role || 'admin')}
                          >
                            <RefreshCcw size={16} />
                          </button>
                          <button 
                            className="btn-icon" 
                            title="Reset Password" 
                            onClick={() => handleResetPassword(u._id, u.username)}
                          >
                            <Lock size={16} />
                          </button>
                          <button 
                            className="btn-icon delete" 
                            title="Delete User"
                            onClick={() => handleDeleteUser(u._id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Staff;
