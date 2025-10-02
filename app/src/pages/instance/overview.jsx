import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import MainLayout from '../../components/mainlayout';
import InstanceHeader from '../../components/instance_header';
import { useNotification } from '../../providers/NotificationProvider';

export default function InstanceOverview() {
  const { hostId, instanceName } = useParams();
  const [loading, setLoading] = useState('');
  const [hostAddress, setHostAddress] = useState('');
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [resourceInfo, setResourceInfo] = useState(null);
  const [loadingResource, setLoadingResource] = useState(true);
  const [dbConfig, setDbConfig] = useState(null);
  const [loadingDbConfig, setLoadingDbConfig] = useState(true);
  const [images, setImages] = useState([]);
  const navigate = useNavigate();
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);
  const notification = useNotification();

  useEffect(() => {
    isMounted.current = true;
    navMoved.current = false;
    
    fetch(`/api/hosts/${hostId}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted.current && data && data.address) {
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
      
    setLoadingResource(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/usage`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (isMounted.current) {
          setResourceInfo(data);
          setLoadingResource(false);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setResourceInfo(null);
          setLoadingResource(false);
        }
      });
    setLoadingDbConfig(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/config`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (isMounted.current) {
          setDbConfig(data);
          setLoadingDbConfig(false);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setDbConfig(null);
          setLoadingDbConfig(false);
        }
      });
    
    fetch('/api/images')
      .then(res => res.json())
      .then(setImages)
      .catch(() => setImages([]));
      
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

  const getImageLabel = (alias) => {
    if (!alias) return '';
    const found = images.find(img => img.value === alias);
    return found ? found.label : alias;
  };

  return (
    <MainLayout>
      <InstanceHeader
        instanceName={instanceName}
        hostId={hostId}
        instanceInfo={instanceInfo}
        loadingInfo={loadingInfo}
        loading={loading}
        onAction={(action) => {
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
                setTimeout(refreshInstanceInfo, 2000);
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
        }}
        navPlaceholderRef={navPlaceholderRef}
      />
      
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
                        <span className="text-white font-medium">{instanceInfo?.host?.name || hostAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Image:</span>
                        <span className="text-white font-medium">{getImageLabel(instanceInfo?.image) || 'Unknown'}</span>
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
                        <span className="text-gray-400">IPv4 (Host IP):</span>
                        <span className="text-white font-medium">{hostAddress || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">IPv6 (Instance Private IP):</span>
                        <span className="text-white font-medium">{instanceInfo?.ipv4 || 'Not assigned'}</span>
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
                        <span className="text-white font-medium">
                          {loadingDbConfig ? 'Loading...' :
                            dbConfig && dbConfig.cpu != null
                              ? `${dbConfig.cpu} vCPU`
                              : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Memory:</span>
                        <span className="text-white font-medium">
                          {loadingDbConfig ? 'Loading...' :
                            dbConfig && dbConfig.ram != null && !isNaN(Number(dbConfig.ram))
                              ? `${(Number(dbConfig.ram) / 1073741824).toFixed(2)} GiB`
                              : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Disk:</span>
                        <span className="text-white font-medium">
                          {loadingDbConfig ? 'Loading...' :
                            dbConfig && dbConfig.disk != null && !isNaN(Number(dbConfig.disk))
                              ? `${(Number(dbConfig.disk) / 1073741824).toFixed(2)} GiB`
                              : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
