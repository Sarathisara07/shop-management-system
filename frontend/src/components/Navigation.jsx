import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Database, History, Archive, LogOut, User, Users, Languages, Sun, Moon, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import './Navigation.css';

const Navigation = () => {
  const { user, logout } = useAuth();
  const { lang, t, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleLangToggle = () => {
    toggleLanguage(lang === 'en' ? 'ta' : 'en');
  };

  return (
    <nav className="sidebar glass-panel">
      <div className="logo-section">
        <img src="/logo192.png" alt="Logo" className="nav-logo-img" />
        <h2>Scrap<span className="text-gradient">Shop</span></h2>
      </div>
      <div className="nav-links">
        <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Home className="icon" size={20} />
          <span>{t('dashboard')}</span>
        </NavLink>
        <NavLink to="/new" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <PlusCircle className="icon" size={20} />
          <span>{t('newEntry')}</span>
        </NavLink>
        <NavLink to="/stock" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Archive className="icon" size={20} />
          <span>{t('liveStock')}</span>
        </NavLink>
        {(!user?.role || user?.role === 'admin') && (
          <>
            <NavLink to="/products" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <Database className="icon" size={20} />
              <span>{t('products')}</span>
            </NavLink>
            <NavLink to="/staff" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <Users className="icon" size={20} />
              <span>Staff</span>
            </NavLink>
          </>
        )}
        <NavLink to="/history" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <History className="icon" size={20} />
          <span>{t('history')}</span>
        </NavLink>
        <NavLink to="/profile" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Settings className="icon" size={20} />
          <span>{t('profileSettings')}</span>
        </NavLink>
      </div>

      <div className="nav-footer">
        <div className="settings-toggles">
          <button onClick={handleLangToggle} className="nav-item-small" title={lang === 'en' ? 'தமிழ்' : 'English'}>
            <Languages size={18} />
          </button>
          <button onClick={toggleTheme} className="nav-item-small" title="Toggle Theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <div className="user-profile">
          <div className="avatar">
            {user?.shopLogo ? (
              <img src={user.shopLogo} alt="Profile" className="avatar-img" />
            ) : (
              <User size={18} />
            )}
          </div>
          <div className="user-info">
            <span className="username">{user?.username || 'Owner'}</span>
            <span className="role-badge">{(!user?.role || user?.role === 'admin') ? 'Admin' : 'Cashier'}</span>
          </div>
        </div>
        <button onClick={logout} className="nav-item logout-btn">
          <LogOut size={20} className="icon" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
