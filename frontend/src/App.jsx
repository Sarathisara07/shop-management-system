import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import Navigation from './components/Navigation';
import AIChatAssistant from './components/AIChatAssistant';

import Dashboard from './pages/Dashboard';
import NewTransaction from './pages/NewTransaction';
import Stock from './pages/Stock';
import Products from './pages/Products';
import History from './pages/History';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Staff from './pages/Staff';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = !user?.role || user?.role === 'admin';
  if (!isAdmin) return <Navigate to="/new" />;
  return children;
};

const RoleBasedRedirect = () => {
  const { user } = useAuth();
  const isAdmin = !user?.role || user?.role === 'admin';
  return <Navigate to={isAdmin ? "/" : "/new"} />;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Private Routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <main className="main-content">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/new" element={<NewTransaction />} />
                        <Route path="/stock" element={<Stock />} />
                        <Route path="/products" element={<AdminRoute><Products /></AdminRoute>} />
                        <Route path="/history" element={<History />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/staff" element={<AdminRoute><Staff /></AdminRoute>} />
                        <Route path="*" element={<RoleBasedRedirect />} />
                      </Routes>
                    </main>
                    <AIChatAssistant />
                  </div>
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
