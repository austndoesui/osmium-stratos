import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import MainLayout from '../../components/mainlayout';
import { Link } from 'react-router-dom';
import { useNotification } from '../../providers/NotificationProvider';
import { NotificationTypes } from '../../components/Notification';

export default function InstanceOverview() {
  const { hostId, instanceName } = useParams();
  const [loading, setLoading] = useState('');
  const [hostAddress, setHostAddress] = useState('');
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const navigate = useNavigate();
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);
  const notification = useNotification();

  useEffect(() => {
    // Set isMounted to true when component mounts
    isMounted.current = true;
    navMoved.current = false;
    
    // Fetch host information
    fetch(`/api/hosts/${hostId}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted.current && data && data.address) {
          // Extract host/ip from address (strip protocol and port)
          try {
            const url = new URL(data.address);
            setHostAddress(url.hostname);
          } catch {
            setHostAddress(data.address);
          }
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setHostAddress('');
        }
      });
      
    // Fetch instance information using /api/vms (like in instances.jsx)
    setLoadingInfo(true);
    fetch('/api/vms')
      .then(res => res.json())
      .then(data => {
        if (isMounted.current) {
        // Flatten all instances
        const allInstances = [];
        data.forEach(({ host, vms }) => {
          if (Array.isArray(vms)) {
            vms.forEach(vm => {
              allInstances.push({ ...vm, host });
            });
          }
        });
        // Find the instance by hostId and instanceName
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
          // Create a clone of the navigation instead of moving the original
          // This prevents DOM errors when React tries to manage the original element
          const navClone = nav.cloneNode(true);
          navClone.style.display = 'block';
          navClone.style.position = 'static';
          navClone.style.width = 'auto';
          
          // Clear placeholder first to avoid appending multiple times
          while (placeholder.firstChild) {
            placeholder.removeChild(placeholder.firstChild);
          }
          
          placeholder.appendChild(navClone);
          navMoved.current = true;
          
          // Update the links in the cloned navigation
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
    
    // Try moving the nav a few times with increasing delays
    // This helps ensure the DOM is ready
    setTimeout(moveNav, 50);
    setTimeout(moveNav, 200);
    setTimeout(moveNav, 500);
    
    // Cleanup function to set isMounted to false when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, [hostId, instanceName, navigate]);

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
          // Show success notification
          notification.showSuccess(`${action.charAt(0).toUpperCase() + action.slice(1)} command sent!`);
          
          // Refresh instance info after a successful action
          setTimeout(() => {
            refreshInstanceInfo();
        }, 2000);
        }
      })
      .catch(err => {
        if (isMounted.current) {
          // Show error notification
          notification.showError(err.message);
        }
      })
      .finally(() => {
        if (isMounted.current) {
          setLoading('');
        }
      });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete instance '${instanceName}'?`)) {
      setLoading('delete');
      fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}`, {
        method: 'DELETE',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to delete instance');
          if (isMounted.current) {
            notification.showSuccess('Instance deletion initiated');
          setTimeout(() => navigate('/instances'), 1500);
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
    }
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
            <li aria-current="page">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">{instanceName}</span>
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
            className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${normalizedStatus(instanceInfo?.status) !== 'running' ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
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
            className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${normalizedStatus(instanceInfo?.status) !== 'running' ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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
      
      {/* Navigation placeholder - the actual nav is in mainlayout.jsx */}
      <div ref={navPlaceholderRef} className="mb-6 pt-4"></div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Instance info */}
        <div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-medium text-white">Instance Details</h2>
            </div>
            
            {loadingInfo ? (
              <div className="p-8 text-center">
                <div className="inline-block h-10 w-10 relative">
                  <div className="absolute inset-0 border-2 border-gray-700 rounded-full"></div>
                  <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-400 mt-3">Loading instance details...</p>
              </div>
            ) : (
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Instance details */}
                  <div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white font-medium">{instanceInfo?.type === 'virtual-machine' ? 'Virtual Machine' : 'Container'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Host:</span>
                        <span className="text-white font-medium">{hostAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Image:</span>
                        <span className="text-white font-medium">{instanceInfo?.image ? instanceInfo.image.split('/').pop() : 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Architecture:</span>
                        <span className="text-white font-medium">{instanceInfo?.architecture || 'x86_64'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Network details */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">Network</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">IPv4:</span>
                        <span className="text-white font-medium">{instanceInfo?.ipv4 || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">IPv6:</span>
                        <span className="text-white font-medium">{instanceInfo?.ipv6 || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">MAC:</span>
                        <span className="text-white font-medium">{instanceInfo?.mac || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Resources */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">Resources</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">CPU:</span>
                        <span className="text-white font-medium">1 vCPU</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Memory:</span>
                        <span className="text-white font-medium">16 GiB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Disk:</span>
                        <span className="text-white font-medium">128 GiB</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Snapshots */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">Snapshots</h3>
                    <div className="text-gray-400 text-sm">
                      No snapshots available
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return <MainLayout>{content}</MainLayout>;
}
