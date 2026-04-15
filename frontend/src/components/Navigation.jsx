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

  const navItems = [
    { to: "/", icon: <Home size={22} />, label: t('dashboard') },
    { to: "/new", icon: <PlusCircle size={22} />, label: t('newEntry') },
    { to: "/stock", icon: <Archive size={22} />, label: t('liveStock') },
    { to: "/products", icon: <Database size={22} />, label: t('products'), adminOnly: true },
    { to: "/history", icon: <History size={22} />, label: t('history') },
    { to: "/staff", icon: <Users size={22} />, label: 'Staff', adminOnly: true },
    { to: "/profile", icon: <Settings size={22} />, label: t('profileSettings') },
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || (!user?.role || user?.role === 'admin')
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar glass-panel">
        <div className="mobile-logo">
          <img src="/logo192.png" alt="Logo" className="nav-logo-img-small" />
          <h3>Scrap<span className="text-gradient">Shop</span></h3>
        </div>
        <div className="mobile-settings">
          <button onClick={handleLangToggle} className="mobile-toggle-btn">
            {lang === 'en' ? 'TA' : 'EN'}
          </button>
          <button onClick={toggleTheme} className="mobile-toggle-btn">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div className="mobile-avatar">
             {user?.shopLogo ? <img src={user.shopLogo} alt="P" className="avatar-img" /> : <User size={16} />}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <nav className="sidebar glass-panel">
        <div className="logo-section">
          <img src="/logo192.png" alt="Logo" className="nav-logo-img" />
          <h2>Scrap<span className="text-gradient">Shop</span></h2>
        </div>
        <div className="nav-links">
          {filteredNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav-footer">
          <div className="settings-toggles">
            <button onClick={handleLangToggle} className="nav-item-small" title={lang === 'en' ? 'தமிழ்' : 'English'}>
              <Languages size={18} />
              <span style={{fontSize: '10px', marginLeft: '4px'}}>{lang === 'en' ? 'TA' : 'EN'}</span>
            </button>
            <button onClick={toggleTheme} className="nav-item-small" title="Toggle Theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>

          <div className="user-profile">
            <div className="avatar">
              {user?.shopLogo ? <img src={user.shopLogo} alt="Profile" className="avatar-img" /> : <User size={18} />}
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

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav glass-panel">
        {filteredNavItems.slice(0, 5).map((item) => (
          <NavLink key={item.to} to={item.to} className={({isActive}) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        {/* More button or separate way for profile if items > 5 */}
        <NavLink to="/profile" className={({isActive}) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}>
           <Settings size={22} />
           <span>{t('profile')}</span>
        </NavLink>
      </nav>
    </>
  );
};

export default Navigation;
