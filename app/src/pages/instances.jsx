import '../index.css';
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import MainLayout from '../components/mainlayout';

function Instances() {
  const [vms, setVMs] = useState([]);
  const [flatInstances, setFlatInstances] = useState([]);
  const [loadingVMs, setLoadingVMs] = useState(true);
  const [error, setError] = useState(null);
  const [instanceConfigs, setInstanceConfigs] = useState({});
  const [loadingConfigs, setLoadingConfigs] = useState({});
  const [gridLayout, setGridLayout] = useState(() => {
    const savedLayout = localStorage.getItem('instancesGridLayout');
    if (savedLayout === 'default') return 'wide';
    return savedLayout || 'full';
  });
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);
  const [images, setImages] = useState([]);

  const fetchInstanceConfig = async (hostId, instanceName) => {
    setLoadingConfigs(prev => ({ ...prev, [`${hostId}-${instanceName}`]: true }));
    try {
      const res = await fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/config`);
      if (res.ok) {
        const data = await res.json();
        setInstanceConfigs(prev => ({ ...prev, [`${hostId}-${instanceName}`]: data }));
      }
    } catch (error) {
      console.error('Error fetching instance config:', error);
    } finally {
      setLoadingConfigs(prev => ({ ...prev, [`${hostId}-${instanceName}`]: false }));
    }
  };

  useEffect(() => {
    setLoadingVMs(true);
    fetch('/api/images')
      .then(res => res.json())
      .then(setImages)
      .catch(() => setImages([]));
    fetch('/api/vms')
      .then(res => res.json())
      .then(data => {
        setVMs(data);
        const allInstances = [];
        data.forEach(({ host, vms }) => {
          if (Array.isArray(vms)) {
            vms.forEach(vm => {
              allInstances.push({ ...vm, host });
              fetchInstanceConfig(host.id, vm.name);
            });
          }
        });
        setFlatInstances(allInstances);
      })
      .catch(() => {
        setVMs([]);
        setFlatInstances([]);
      })
      .finally(() => setLoadingVMs(false));
  }, []);

  const userInstances = flatInstances.filter(vm => {
    if (!vm.owner || !user) return false;
    return (
      (vm.owner.username && vm.owner.username === user.username) ||
      (vm.owner.email && vm.owner.email === user.email)
    );
  });

  const getImageLabel = (alias) => {
    if (!alias) return '';
    const found = images.find(img => img.value === alias);
    return found ? found.label : alias;
  };

  const getHostIp = (host) => {
    if (host && host.address) {
      try {
        return new URL(host.address).hostname;
      } catch {
        return host.address;
      }
    }
    return '';
  };

  const instancesContent = (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-medium text-white">Your Instances</h2>
        <div className="flex space-x-3">
          <div className="flex bg-gray-800 rounded-md mr-2 border border-gray-700 relative group">
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {gridLayout === 'wide' ? 'Two cards per row' : 'One card per row'}
            </div>
            <button
              className={`p-2 ${gridLayout === 'wide' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'} rounded-l-md transition-colors`}
              onClick={() => {
                setGridLayout('wide');
                localStorage.setItem('instancesGridLayout', 'wide');
              }}
              title="Two cards per row"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="8" height="8" rx="1" />
                <rect x="13" y="3" width="8" height="8" rx="1" />
                <rect x="3" y="13" width="8" height="8" rx="1" />
                <rect x="13" y="13" width="8" height="8" rx="1" />
              </svg>
            </button>
            <button
              className={`p-2 ${gridLayout === 'full' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'} rounded-r-md transition-colors`}
              onClick={() => {
                setGridLayout('full');
                localStorage.setItem('instancesGridLayout', 'full');
              }}
              title="One card per row"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="8" rx="1" />
                <rect x="3" y="13" width="18" height="8" rx="1" />
              </svg>
            </button>
          </div>
          
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
            onClick={() => {
              setLoadingVMs(true);
              fetch('/api/vms')
                .then(res => res.json())
                .then(data => {
                  setVMs(data);
                  const allInstances = [];
                  data.forEach(({ host, vms }) => {
                    if (Array.isArray(vms)) {
                      vms.forEach(vm => {
                        allInstances.push({ ...vm, host });
                        fetchInstanceConfig(host.id, vm.name);
                      });
                    }
                  });
                  setFlatInstances(allInstances);
                })
                .catch(() => {
                  setVMs([]);
                  setFlatInstances([]);
                })
                .finally(() => setLoadingVMs(false));
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {loadingVMs ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="inline-block h-10 w-10 relative">
            <div className="absolute inset-0 border-2 border-gray-700 rounded-full"></div>
            <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400 mt-3">Loading instances...</p>
        </div>
      ) : userInstances.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.507 4.048A3 3 0 0 1 7.785 3h8.43a3 3 0 0 1 2.278 1.048l1.722 2.008A4.533 4.533 0 0 0 19.5 6h-15c-.243 0-.482.02-.715.056l1.722-2.008Z" />
            <path fillRule="evenodd" d="M1.5 10.5a3 3 0 0 1 3-3h15a3 3 0 1 1 0 6h-15a3 3 0 0 1-3-3Zm15 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm2.25.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4.5 15a3 3 0 1 0 0 6h15a3 3 0 1 0 0-6h-15Zm11.25 3.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM19.5 18a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd" />
          </svg>
          <p className="text-gray-400">No instances found</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-4 ${
          gridLayout === 'wide' ? 'md:grid-cols-2' : ''
        }`}>
          {userInstances.map(vm => {
            const configKey = `${vm.host.id}-${vm.name}`;
            const config = instanceConfigs[configKey];
            const isLoading = loadingConfigs[configKey];

            return (
              <div
                key={vm.name + vm.host.id}
                className={`relative bg-gray-800 rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-750 transition overflow-hidden ${
                  gridLayout === 'full' ? 'flex flex-row items-center' : 'flex flex-col'
                }`}
                onClick={() => navigate(`/instance/${vm.host.id}/${vm.name}`)}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  vm.status === 'Running' ? 'bg-green-500' : 
                  vm.status === 'Stopped' ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`} />
                <div className={gridLayout === 'full' ? 'p-5 pl-6 flex-grow' : 'p-4 pl-6'}>
                  {gridLayout === 'full' ? (
                    <>
                      <div className="flex items-center mb-2">
                        <div className="font-medium text-lg text-white mr-3">{vm.name}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          vm.status === 'Running' ? 'bg-green-900/40 text-green-400 border border-green-700' : 
                          vm.status === 'Stopped' ? 'bg-red-900/40 text-red-400 border border-red-700' : 
                          'bg-yellow-900/40 text-yellow-400 border border-yellow-700'
                        }`}>
                          {vm.status}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-400">
                        <div className="flex flex-wrap items-center">
                          <span>{getHostIp(vm.host) || 'Unknown host IP'}</span>
                          <span className="mx-1 text-gray-600">|</span>
                          <span>{vm.host.name}</span>
                          <span className="mx-2 text-gray-600">|</span>
                          <span>{vm.type === 'virtual-machine' ? 'VM' : 'Container'}</span>
                          {vm.image && (
                            <>
                              <span className="mx-2 text-gray-600">|</span>
                              <span>{getImageLabel(vm.image)}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center">
                          {isLoading ? (
                            <span>Loading specs...</span>
                          ) : config ? (
                            <>
                              <span>{config.cpu ? `${config.cpu} vCPU` : 'Unknown CPU'}</span>
                              <span className="mx-2 text-gray-600">|</span>
                              <span>
                                {config.ram ? `${(Number(config.ram) / 1073741824).toFixed(2)} GiB RAM` : 'Unknown RAM'}
                              </span>
                              <span className="mx-2 text-gray-600">|</span>
                              <span>
                                {config.disk ? `${(Number(config.disk) / 1073741824).toFixed(2)} GiB Disk` : 'Unknown Disk'}
                              </span>
                            </>
                          ) : (
                            <span>Specs not available</span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-lg text-white">{vm.name}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          vm.status === 'Running' ? 'bg-green-900/40 text-green-400 border border-green-700' : 
                          vm.status === 'Stopped' ? 'bg-red-900/40 text-red-400 border border-red-700' : 
                          'bg-yellow-900/40 text-yellow-400 border border-yellow-700'
                        }`}>
                          {vm.status}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-400">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-wrap gap-2">
                            <span>{getHostIp(vm.host) || 'Unknown host IP'}</span>
                            <span className="text-gray-600">|</span>
                            <span>{vm.host.name}</span>
                            <span className="text-gray-600">|</span>
                            <span>{vm.type === 'virtual-machine' ? 'VM' : 'Container'}</span>
                            {vm.image && (
                              <>
                                <span className="text-gray-600">|</span>
                                <span>{getImageLabel(vm.image)}</span>
                              </>
                            )}
                          </div>
                          <div className="text-right">
                            {isLoading ? (
                              <span>Loading specs...</span>
                            ) : config ? (
                              <div className="space-y-1">
                                <div>{config.cpu ? `${config.cpu} vCPU` : 'Unknown CPU'}</div>
                                <div>{config.ram ? `${(Number(config.ram) / 1073741824).toFixed(2)} GiB RAM` : 'Unknown RAM'}</div>
                                <div>{config.disk ? `${(Number(config.disk) / 1073741824).toFixed(2)} GiB Disk` : 'Unknown Disk'}</div>
                              </div>
                            ) : (
                              <span>Specs not available</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return <MainLayout>{instancesContent}</MainLayout>;
}

export default Instances;
