import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import Dashboard from './pages/dashboard';
import AdminNode from './pages/admin/node';
import AdminImage from './pages/admin/image';
import AdminOverview from './pages/admin/overview';
import AdminUsers from './pages/admin/users';
import AdminInstances from './pages/admin/instances';
import InstanceOverview from './pages/instance/overview';
import Console from './pages/instance/console';
import Metrics from './pages/instance/metrics';
import Network from './pages/instance/network';
import History from './pages/instance/history';
import Destroy from './pages/instance/destroy';
import Resize from './pages/instance/resize';
import Auth from './pages/auth';
import Instances from './pages/instances';
import Account from './pages/account';
import NotFound from './pages/errors/404';
import { useEffect, useState, useContext } from 'react';
import React, { createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationProvider } from './providers/NotificationProvider';

const AuthContext = createContext();
export { AuthContext };

function getUserFromJWT() {
  const token = localStorage.getItem('jwt');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check for expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem('jwt');
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUserFromJWT());
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setUser(getUserFromJWT());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const login = (token) => {
    localStorage.setItem('jwt', token);
    setUser(getUserFromJWT());
    navigate('/dashboard', { replace: true });
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    setUser(null);
    navigate('/auth', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function RequireAuth({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useContext(AuthContext);
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/instances" element={<RequireAuth><Instances /></RequireAuth>} />
      <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/admin/overview" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
      <Route path="/admin/node" element={<RequireAdmin><AdminNode /></RequireAdmin>} />
      <Route path="/admin/image" element={<RequireAdmin><AdminImage /></RequireAdmin>} />
      <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
      <Route path="/admin/instances" element={<RequireAdmin><AdminInstances /></RequireAdmin>} />
      <Route path="/instance/:hostId/:instanceName" element={<RequireAuth><InstanceOverview /></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/console" element={<RequireAuth><Console /></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/metrics" element={<RequireAuth><Metrics /></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/network" element={<RequireAuth><Network /></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/history" element={<RequireAuth><History /></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/destroy" element={<RequireAuth><Destroy /></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/resize" element={<RequireAdmin><Resize /></RequireAdmin>} />
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
        <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App
