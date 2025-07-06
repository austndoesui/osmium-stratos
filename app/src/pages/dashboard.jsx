import '../index.css';
import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import MainLayout from '../components/mainlayout';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    instances: 0,
    running: 0,
    stopped: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/vms')
      .then(res => res.json())
      .then(data => {
        // Flatten all instances
        const allInstances = [];
        data.forEach(({ host, vms }) => {
          if (Array.isArray(vms)) {
            vms.forEach(vm => {
              allInstances.push({ ...vm, host });
            });
          }
        });
        // Filter to only current user's instances
        const userInstances = allInstances.filter(vm => {
          if (!vm.owner || !user) return false;
          return (
            (vm.owner.username && vm.owner.username === user.username) ||
            (vm.owner.email && vm.owner.email === user.email)
          );
        });
        // Calculate stats for user's instances
        let totalInstances = userInstances.length;
        let runningInstances = userInstances.filter(vm => vm.status === 'Running').length;
        let stoppedInstances = userInstances.filter(vm => vm.status === 'Stopped').length;
        setStats({
          instances: totalInstances,
          running: runningInstances,
          stopped: stoppedInstances
        });
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err);
        })
      .finally(() => setLoading(false));
  }, [user]);

  const dashboardContent = (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
              <Link to="/" className="text-sm text-gray-400 hover:text-white">
                Home
              </Link>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">Dashboard</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Welcome back, {user?.username || 'User'}</h1>
        <p className="text-base text-gray-400">Here's what's happening with your instances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 relative">
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
            <div className="p-2 rounded-full bg-blue-500 bg-opacity-10 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
              </svg>
            </div>
          </div>
          <div className="mr-16">
            <h2 className="text-base font-medium text-gray-300">Total Instances</h2>
            {loading ? (
              <div className="h-7 w-14 bg-gray-700 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-white">{stats.instances}</p>
            )}
                  </div>
                </div>
        
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 relative">
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
            <div className="p-2 rounded-full bg-green-500 bg-opacity-10 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              </div>
          </div>
          <div className="mr-16">
            <h2 className="text-base font-medium text-gray-300">Running</h2>
            {loading ? (
              <div className="h-7 w-14 bg-gray-700 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-white">{stats.running}</p>
        )}
      </div>
              </div>
        
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 relative">
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
            <div className="p-2 rounded-full bg-red-500 bg-opacity-10 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              </div>
              </div>
          <div className="mr-16">
            <h2 className="text-base font-medium text-gray-300">Stopped</h2>
            {loading ? (
              <div className="h-7 w-14 bg-gray-700 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-white">{stats.stopped}</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white mb-5">Getting Started</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            How to Create Your First Instance
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            Learn how to create and configure your first virtual machine or container in just a few steps.
          </p>
          <Link to="/docs/create-instance" className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center">
            Read guide
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            Optimizing Performance
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            Tips and best practices for optimizing the performance of your virtual machines and containers.
          </p>
          <Link to="/docs/performance" className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center">
            Read guide
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Troubleshooting Common Issues
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            Solutions for common problems you might encounter when working with virtual machines.
          </p>
          <Link to="/docs/troubleshooting" className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center">
            Read guide
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Port Forwarding Guide
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            Learn how to install and use the port utility for forwarding ports when you lack IPv4 addresses.
          </p>
          <a href="https://docs.qena.pro/setup-guides/portforwarding" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center">
            Read guide
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );

  return <MainLayout>{dashboardContent}</MainLayout>;
}

export default Dashboard;
