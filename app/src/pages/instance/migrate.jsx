import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import InstanceHeader from '../../components/instance_header';
import { useNotification } from '../../providers/NotificationProvider';

export default function Migrate() {
  const { hostId, instanceName } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [hosts, setHosts] = useState([]);
  const [selectedHost, setSelectedHost] = useState('');
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loading, setLoading] = useState('');
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    navMoved.current = false;
    
    const fetchHosts = async () => {
      try {
        const res = await fetch('/api/hosts');
        if (res.ok) {
          const hostsData = await res.json();
          const availableHosts = hostsData.filter(host => host.id !== hostId);
          setHosts(availableHosts);
        } else {
          showError('Failed to fetch available hosts');
        }
      } catch (error) {
        console.error('Error fetching hosts:', error);
        showError('Failed to load hosts. Please try again later.');
      }
    };

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

    fetchHosts();
    
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
  }, [hostId, instanceName, showError, navigate]);

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
          showSuccess(`${action.charAt(0).toUpperCase() + action.slice(1)} command sent!`);
          setTimeout(() => {
            refreshInstanceInfo();
          }, 2000);
        }
      })
      .catch(err => {
        if (isMounted.current) {
          showError(err.message);
        }
      })
      .finally(() => {
        if (isMounted.current) {
          setLoading('');
        }
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedHost) {
      showError('Please select a destination host');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetHostId: selectedHost })
      });

      if (res.ok) {
        showSuccess(`Migration of ${instanceName} initiated successfully`);
        navigate(`/instance/${selectedHost}/${instanceName}`);
      } else {
        const error = await res.json();
        throw new Error(error.message || 'Failed to migrate instance');
      }
    } catch (error) {
      console.error('Migration error:', error);
      showError(error.message || 'Failed to migrate instance. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <InstanceHeader
        instanceName={instanceName}
        hostId={hostId}
        instanceInfo={instanceInfo}
        loadingInfo={loadingInfo}
        loading={loading}
        onAction={handleAction}
        navPlaceholderRef={navPlaceholderRef}
      />
        
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-700">
          <h2 className="text-lg font-medium text-white">Migrate Instance</h2>
        </div>
        <div className="p-6 bg-gray-850">
          <div className="mb-6">
            <div className="bg-gray-700 border-l-4 border-white p-4 rounded-md mb-6 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <div>
                <p className="font-medium text-white">Migration will move this instance to another host.</p>
                <p className="mt-1 text-sm text-gray-300">The instance needs to be stopped before migration. Any data not in persistent storage may be lost.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="host" className="block text-sm font-medium text-white mb-2">
                  Destination Host
                </label>
                <div className="relative">
                  <select
                    id="host"
                    name="host"
                    value={selectedHost}
                    onChange={(e) => setSelectedHost(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white shadow-sm appearance-none cursor-pointer pr-10"
                    required
                  >
                    <option value="">Select a host</option>
                    {hosts.map((host) => (
                      <option key={host.id} value={host.id}>{host.name} ({host.address})</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {hosts.length === 0 && (
                  <p className="text-yellow-400 text-sm mt-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    No other hosts available for migration
                  </p>
                )}
              </div>

              <div className="flex items-center pt-4">
                <button
                  type="button"
                  onClick={() => navigate(`/instance/${hostId}/${instanceName}`)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer mr-4 border border-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || hosts.length === 0 || !selectedHost}
                  className={`bg-white hover:bg-gray-100 text-gray-900 px-5 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isLoading || hosts.length === 0 || !selectedHost
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Migrating...
                    </span>
                  ) : 'Migrate Instance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
