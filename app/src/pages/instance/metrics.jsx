import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import { useNotification } from '../../providers/NotificationProvider';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Metrics() {
  const { hostId, instanceName } = useParams();
  const navigate = useNavigate();
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loading, setLoading] = useState('');
  const [usageHistory, setUsageHistory] = useState([]); // Array of { timestamp, cpu, memory, disk, network }
  const [usageError, setUsageError] = useState(null);
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);
  const notification = useNotification();

  useEffect(() => {
    isMounted.current = true;
    navMoved.current = false;
    setUsageHistory([]);
    setUsageError(null);

    // Fetch instance information
    setLoadingInfo(true);
    fetch('/api/vms')
      .then(res => res.json())
      .then(data => {
        if (isMounted.current) {
          const allInstances = [];
          data.forEach(({ host, vms }) => {
            if (Array.isArray(vms)) {
              vms.forEach(vm => {
                allInstances.push({ ...vm, host });
              });
            }
          });
          const found = allInstances.find(
            vm => String(vm.host.id) === String(hostId) && vm.name === instanceName
          );
          setInstanceInfo(found || null);
          setLoadingInfo(false);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setInstanceInfo(null);
          setLoadingInfo(false);
        }
      });

    // Move the navigation bar from mainlayout to below the instance name
    const moveNav = () => {
      if (!isMounted.current || navMoved.current) return;
      
      try {
        const nav = document.getElementById('instance-nav');
        const placeholder = navPlaceholderRef.current;
        
        if (nav && placeholder) {
          const navClone = nav.cloneNode(true);
          navClone.style.display = 'block';
          navClone.style.position = 'static';
          navClone.style.width = 'auto';
          
          while (placeholder.firstChild) {
            placeholder.removeChild(placeholder.firstChild);
          }
          
          placeholder.appendChild(navClone);
          navMoved.current = true;
          
          const links = navClone.querySelectorAll('a');
          links.forEach(link => {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              navigate(link.getAttribute('href'));
            });
          });
        }
      } catch (err) {
        console.error('Error moving navigation:', err);
      }
    };
    
    setTimeout(moveNav, 50);
    setTimeout(moveNav, 200);
    setTimeout(moveNav, 500);
    
    return () => {
      isMounted.current = false;
    };
  }, [hostId, instanceName, navigate]);

  // Poll resource usage every 5 seconds
  useEffect(() => {
    let interval;
    let stopped = false;
    function fetchUsage() {
      fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/usage`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch usage');
          return res.json();
        })
        .then(data => {
          if (!isMounted.current || stopped) return;
          setUsageError(null);
          setUsageHistory(prev => {
            const now = Date.now();
            const entry = {
              timestamp: now,
              cpu: data.cpu,
              memory: data.memory?.usage,
              memory_peak: data.memory?.usage_peak,
              disk: data.disk?.root?.usage,
              network_rx: data.network && data.network.eth0 ? data.network.eth0.counters?.bytes_received : null,
              network_tx: data.network && data.network.eth0 ? data.network.eth0.counters?.bytes_sent : null,
            };
            // Keep only last 10 entries
            const updated = [...prev, entry].slice(-10);
            return updated;
          });
        })
        .catch(err => {
          if (!isMounted.current || stopped) return;
          setUsageError('Failed to fetch usage');
        });
    }
    fetchUsage();
    interval = setInterval(fetchUsage, 5000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [hostId, instanceName]);

  const refreshInstanceInfo = () => {
    if (!isMounted.current) return;
    
    fetch('/api/vms')
      .then(res => res.json())
      .then(data => {
        if (isMounted.current) {
          const allInstances = [];
          data.forEach(({ host, vms }) => {
            if (Array.isArray(vms)) {
              vms.forEach(vm => {
                allInstances.push({ ...vm, host });
              });
            }
          });
          const found = allInstances.find(
            vm => String(vm.host.id) === String(hostId) && vm.name === instanceName
          );
          setInstanceInfo(found || null);
        }
      })
      .catch(() => {
        // Silently fail
      });
  };

  const handleAction = (action) => {
    setLoading(action);
    
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/${action}`, {
      method: 'POST',
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.error || `Failed to ${action} instance`);
          });
        }
        return res.json();
      })
      .then(data => {
        if (isMounted.current) {
          notification.showSuccess(`${action.charAt(0).toUpperCase() + action.slice(1)} command sent!`);
          setTimeout(() => {
            refreshInstanceInfo();
          }, 2000);
        }
      })
      .catch(err => {
        if (isMounted.current) {
          notification.showError(err.message);
        }
      })
      .finally(() => {
        if (isMounted.current) {
          setLoading('');
        }
      });
  };

  // Chart data from usageHistory
  const timeLabels = usageHistory.map(entry => {
    const d = new Date(entry.timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  // CPU: LXD returns nanoseconds, so we can show % by diffing over time (approximate)
  let cpuPercents = [];
  if (usageHistory.length > 1) {
    for (let i = 1; i < usageHistory.length; ++i) {
      const prev = usageHistory[i-1];
      const curr = usageHistory[i];
      const deltaNs = curr.cpu - prev.cpu;
      const deltaMs = curr.timestamp - prev.timestamp;
      // 1 core = 1e9 ns/sec, so % = (deltaNs / 1e9) / (deltaMs / 1000) * 100
      const percent = deltaMs > 0 ? ((deltaNs / 1e9) / (deltaMs / 1000)) * 100 : 0;
      cpuPercents.push(Math.max(0, Math.min(percent, 100)));
    }
    cpuPercents = [0, ...cpuPercents]; // pad to match length
  } else {
    cpuPercents = usageHistory.map(() => 0);
  }
  // Memory: show as MB
  const memoryMB = usageHistory.map(e => e.memory ? e.memory / 1048576 : 0);
  // Disk: show as GB
  const diskGB = usageHistory.map(e => e.disk ? e.disk / 1073741824 : 0);
  // Network: MB/s (diff over time)
  let rxMBs = [], txMBs = [];
  if (usageHistory.length > 1) {
    for (let i = 1; i < usageHistory.length; ++i) {
      const prev = usageHistory[i-1];
      const curr = usageHistory[i];
      const dt = (curr.timestamp - prev.timestamp) / 1000;
      rxMBs.push(dt > 0 && curr.network_rx != null && prev.network_rx != null ? (curr.network_rx - prev.network_rx) / 1048576 / dt : 0);
      txMBs.push(dt > 0 && curr.network_tx != null && prev.network_tx != null ? (curr.network_tx - prev.network_tx) / 1048576 / dt : 0);
    }
    rxMBs = [0, ...rxMBs];
    txMBs = [0, ...txMBs];
  } else {
    rxMBs = usageHistory.map(() => 0);
    txMBs = usageHistory.map(() => 0);
  }

  const chartData = {
    cpu: cpuPercents,
    memory: memoryMB,
    disk: diskGB,
    network: {
      rx: rxMBs,
      tx: txMBs
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#fff'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#fff'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#fff'
        }
      }
    }
  };

  const createChartData = (data, label, color) => ({
    labels: timeLabels,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0.4,
        fill: true
      }
    ]
  });

  const networkChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Download',
        data: rxMBs,
        borderColor: '#4ade80',
        backgroundColor: '#4ade8020',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Upload',
        data: txMBs,
        borderColor: '#60a5fa',
        backgroundColor: '#60a5fa20',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Helper to normalize status string
  const normalizedStatus = (status) => (status ? status.toLowerCase() : '');

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-700 text-gray-300 border border-gray-600';
    status = normalizedStatus(status);
    if (status === 'running') return 'bg-green-900/40 text-green-400 border border-green-700';
    if (status === 'stopped') return 'bg-red-900/40 text-red-400 border border-red-700';
    return 'bg-yellow-900/40 text-yellow-400 border border-yellow-700';
  };

  const content = (
    <>
      {/* Breadcrumb navigation */}
      <div className="mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
              <Link to="/" className="text-sm text-gray-400 hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <Link to="/instances" className="text-sm text-gray-400 hover:text-white ml-1 md:ml-2">
                  Instances
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <Link to={`/instance/${hostId}/${instanceName}`} className="text-sm text-gray-400 hover:text-white ml-1 md:ml-2">
                  {instanceName}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">Metrics</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>
      
      {/* Main heading with action buttons */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold text-white mr-3">{instanceName}</h1>
          {loadingInfo ? (
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600 animate-pulse">
              Loading...
            </div>
          ) : (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 ${getStatusColor(instanceInfo?.status)}`}
              title={instanceInfo?.status || 'Unknown'}
            >
              {instanceInfo?.status ? instanceInfo.status.charAt(0).toUpperCase() + instanceInfo.status.slice(1) : 'Unknown'}
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${normalizedStatus(instanceInfo?.status) === 'running' ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            disabled={loading === 'start' || normalizedStatus(instanceInfo?.status) === 'running'}
            onClick={() => handleAction('start')}
          >
            {loading === 'start' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Start
              </>
            )}
          </button>
          
          <button
            className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${normalizedStatus(instanceInfo?.status) !== 'running' ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
            disabled={loading === 'stop' || normalizedStatus(instanceInfo?.status) !== 'running'}
            onClick={() => handleAction('stop')}
          >
            {loading === 'stop' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Stopping...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop
              </>
            )}
          </button>
          
          <button
            className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${normalizedStatus(instanceInfo?.status) !== 'running' ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
            disabled={loading === 'restart' || normalizedStatus(instanceInfo?.status) !== 'running'}
            onClick={() => handleAction('restart')}
          >
            {loading === 'restart' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Restarting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Restart
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Navigation placeholder */}
      <div ref={navPlaceholderRef} className="mb-6 pt-4"></div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 gap-6">
        {/* CPU Usage */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">CPU Load</h2>
            {usageError && <span className="text-xs text-red-400 ml-2">{usageError}</span>}
          </div>
          <div className="p-5">
            <div className="h-[300px]">
              <Line 
                data={createChartData(chartData.cpu, 'CPU %', '#f87171')} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: { display: false }
                  }
                }} 
              />
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">Memory Usage (MB)</h2>
          </div>
          <div className="p-5">
            <div className="h-[300px]">
              <Line 
                data={createChartData(chartData.memory, 'Memory MB', '#fbbf24')} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: { display: false }
                  }
                }} 
              />
            </div>
          </div>
        </div>

        {/* Disk Usage */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">Disk Usage (GB)</h2>
          </div>
          <div className="p-5">
            <div className="h-[300px]">
              <Line 
                data={createChartData(chartData.disk, 'Disk GB', '#a78bfa')} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: { display: false }
                  }
                }} 
              />
            </div>
          </div>
        </div>

        {/* Network Usage */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">Network I/O (MB/s)</h2>
          </div>
          <div className="p-5">
            <div className="h-[300px]">
              <Line 
                data={networkChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: { display: false }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return <MainLayout>{content}</MainLayout>;
}

export default Metrics; 