import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';
import Dashboard from './pages/dashboard';
import AdminNode from './pages/admin/node';
import AdminImage from './pages/admin/image';
import InstanceOverview from './pages/instance/overview';
import Console from './pages/instance/console';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin/node" element={<AdminNode />} />
        <Route path="/admin/image" element={<AdminImage />} />
        <Route path="/instance/:hostId/:instanceName" element={<InstanceOverview />} />
        <Route path="/instance/:hostId/:instanceName/console" element={<Console />} />
      </Routes>
    </Router>
  );
}

export default App
