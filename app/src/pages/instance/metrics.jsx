import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import { useNotification } from '../../providers/NotificationProvider';
import InstanceHeader from '../../components/instance_header';
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
  const [usageHistory, setUsageHistory] = useState([]);
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

  const timeLabels = usageHistory.map(entry => {
    const d = new Date(entry.timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  let cpuPercents = [];
  if (usageHistory.length > 1) {
    for (let i = 1; i < usageHistory.length; ++i) {
      const prev = usageHistory[i-1];
      const curr = usageHistory[i];
      const deltaNs = curr.cpu - prev.cpu;
      const deltaMs = curr.timestamp - prev.timestamp;
      const percent = deltaMs > 0 ? ((deltaNs / 1e9) / (deltaMs / 1000)) * 100 : 0;
      cpuPercents.push(Math.max(0, Math.min(percent, 100)));
    }
    cpuPercents = [0, ...cpuPercents];
  } else {
    cpuPercents = usageHistory.map(() => 0);
  }
  const memoryMB = usageHistory.map(e => e.memory ? e.memory / 1048576 : 0);
  const diskGB = usageHistory.map(e => e.disk ? e.disk / 1073741824 : 0);
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
      <InstanceHeader
        instanceName={instanceName}
        hostId={hostId}
        instanceInfo={instanceInfo}
        loadingInfo={loadingInfo}
        loading={loading}
        onAction={handleAction}
        navPlaceholderRef={navPlaceholderRef}
      />
      
      <div className="grid grid-cols-1 gap-6">
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