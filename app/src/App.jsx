import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import Auth from './pages/auth';
import NotFound from './pages/errors/404';
import { useEffect, useState, useContext } from 'react';
import React, { createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationProvider } from './providers/NotificationProvider';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./pages/dashboard'));
const AdminNode = lazy(() => import('./pages/admin/node'));
const AdminImage = lazy(() => import('./pages/admin/image'));
const AdminOverview = lazy(() => import('./pages/admin/overview'));
const AdminUsers = lazy(() => import('./pages/admin/users'));
const AdminInstances = lazy(() => import('./pages/admin/instances'));
const AdminSettings = lazy(() => import('./pages/admin/settings'));
const AdminThemes = lazy(() => import('./pages/admin/settings/themes'));
const AdminConfig = lazy(() => import('./pages/admin/settings/config'));
const AdminAdvanced = lazy(() => import('./pages/admin/settings/advances'));
const InstanceOverview = lazy(() => import('./pages/instance/overview'));
const Console = lazy(() => import('./pages/instance/console'));
const Metrics = lazy(() => import('./pages/instance/metrics'));
const Network = lazy(() => import('./pages/instance/network'));
const History = lazy(() => import('./pages/instance/history'));
const Destroy = lazy(() => import('./pages/instance/destroy'));
const Resize = lazy(() => import('./pages/instance/resize'));
const Snapshots = lazy(() => import('./pages/instance/snapshots'));
const Migrate = lazy(() => import('./pages/instance/migrate'));
const Instances = lazy(() => import('./pages/instances'));
const Account = lazy(() => import('./pages/account'));

const AuthContext = createContext();
export { AuthContext };

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}

function getUserFromJWT() {
  const token = localStorage.getItem('jwt');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
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

  useEffect(() => {
    const handler = () => setUser(getUserFromJWT());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    const tokenCheckInterval = setInterval(() => {
      const currentUser = getUserFromJWT();
      if (user && !currentUser) {
        logout();
      }
    }, 30000);

    return () => clearInterval(tokenCheckInterval);
  }, [user, logout]);

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
      <Route path="/dashboard" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense></RequireAuth>} />
      <Route path="/instances" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><Instances /></Suspense></RequireAuth>} />
      <Route path="/account" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><Account /></Suspense></RequireAuth>} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/admin/overview" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminOverview /></Suspense></RequireAdmin>} />
      <Route path="/admin/node" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminNode /></Suspense></RequireAdmin>} />
      <Route path="/admin/image" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminImage /></Suspense></RequireAdmin>} />
      <Route path="/admin/users" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminUsers /></Suspense></RequireAdmin>} />
      <Route path="/admin/instances" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminInstances /></Suspense></RequireAdmin>} />
      <Route path="/admin/settings" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminSettings /></Suspense></RequireAdmin>} />
      <Route path="/admin/settings/config" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminConfig /></Suspense></RequireAdmin>} />
      <Route path="/admin/settings/themes" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminThemes /></Suspense></RequireAdmin>} />
      <Route path="/admin/settings/advanced" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><AdminAdvanced /></Suspense></RequireAdmin>} />
      <Route path="/instance/:hostId/:instanceName" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><InstanceOverview /></Suspense></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/console" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><Console /></Suspense></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/metrics" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><Metrics /></Suspense></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/network" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><Network /></Suspense></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/history" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><History /></Suspense></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/destroy" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><Destroy /></Suspense></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/resize" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><Resize /></Suspense></RequireAdmin>} />
      <Route path="/instance/:hostId/:instanceName/snapshots" element={<RequireAuth><Suspense fallback={<LoadingSpinner />}><Snapshots /></Suspense></RequireAuth>} />
      <Route path="/instance/:hostId/:instanceName/migrate" element={<RequireAdmin><Suspense fallback={<LoadingSpinner />}><Migrate /></Suspense></RequireAdmin>} />
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <NotificationProvider>
            <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App
