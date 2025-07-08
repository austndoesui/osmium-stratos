import { Link, useLocation } from 'react-router-dom';
import { useNotification } from '../providers/NotificationProvider';
import { useState, useEffect } from 'react';

export default function InstanceHeader({ 
  instanceName, 
  hostId, 
  instanceInfo, 
  loadingInfo, 
  loading, 
  onAction,
  navPlaceholderRef 
}) {
  const notification = useNotification();
  const location = useLocation();
  const [images, setImages] = useState([]);
  const [dbConfig, setDbConfig] = useState(null);
  const [loadingDbConfig, setLoadingDbConfig] = useState(true);

  // Get current page from URL
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.endsWith('/metrics')) return 'Metrics';
    if (path.endsWith('/console')) return 'Console';
    if (path.endsWith('/destroy')) return 'Destroy';
    if (path.endsWith('/resize')) return 'Resize';
    if (path.endsWith('/history')) return 'History';
    if (path.endsWith('/network')) return 'Network';
    return 'Overview';
  };

  // Helper to normalize status string
  const normalizedStatus = (status) => (status ? status.toLowerCase() : '');

  // Helper to get image label from alias
  const getImageLabel = (alias) => {
    if (!alias) return '';
    const found = images.find(img => img.value === alias);
    return found ? found.label : alias;
  };

  // Helper to get host IP from instanceInfo
  const getHostIp = () => {
    if (instanceInfo && instanceInfo.host && instanceInfo.host.address) {
      try {
        return new URL(instanceInfo.host.address).hostname;
      } catch {
        return instanceInfo.host.address;
      }
    }
    return '';
  };

  useEffect(() => {
    // Fetch images list
    fetch('/api/images')
      .then(res => res.json())
      .then(setImages)
      .catch(() => setImages([]));

    // Fetch instance config from DB
    setLoadingDbConfig(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/config`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setDbConfig(data);
        setLoadingDbConfig(false);
      })
      .catch(() => {
        setDbConfig(null);
        setLoadingDbConfig(false);
      });
  }, [hostId, instanceName]);

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-700 text-gray-300 border border-gray-600';
    status = normalizedStatus(status);
    if (status === 'running') return 'bg-green-900/40 text-green-400 border border-green-700';
    if (status === 'stopped') return 'bg-red-900/40 text-red-400 border border-red-700';
    return 'bg-yellow-900/40 text-yellow-400 border border-yellow-700';
  };

  const handleAction = (action) => {
    if (onAction) {
      onAction(action);
    }
  };

  return (
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
                <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">{getCurrentPage()}</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Main heading with status */}
      <div className="flex justify-between items-start mb-2">
        <div>
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
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {instanceInfo?.status === 'Running' && loading === 'stop' && 'Stopping...'}
                    {instanceInfo?.status === 'Running' && loading === 'restart' && 'Restarting...'}
                    {instanceInfo?.status === 'Stopped' && loading === 'start' && 'Starting...'}
                  </span>
                ) : (
                  instanceInfo?.status ? instanceInfo.status.charAt(0).toUpperCase() + instanceInfo.status.slice(1) : 'Unknown'
                )}
              </span>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-400 flex items-center">
            <span>{getHostIp() || 'Unknown host IP'}</span>
            <span className="mx-2 text-gray-600">|</span>
            <span>{getImageLabel(instanceInfo?.image) || 'Unknown image'}</span>
            <span className="mx-2 text-gray-600">|</span>
            <span>
              {loadingDbConfig ? 'Loading...' :
                dbConfig && dbConfig.cpu != null
                  ? `${dbConfig.cpu} vCPU`
                  : 'Unknown CPU'}
            </span>
            <span className="mx-2 text-gray-600">|</span>
            <span>
              {loadingDbConfig ? 'Loading...' :
                dbConfig && dbConfig.ram != null && !isNaN(Number(dbConfig.ram))
                  ? `${(Number(dbConfig.ram) / 1073741824).toFixed(2)} GiB RAM`
                  : 'Unknown RAM'}
            </span>
            <span className="mx-2 text-gray-600">|</span>
            <span>
              {loadingDbConfig ? 'Loading...' :
                dbConfig && dbConfig.disk != null && !isNaN(Number(dbConfig.disk))
                  ? `${(Number(dbConfig.disk) / 1073741824).toFixed(2)} GiB Disk`
                  : 'Unknown Disk'}
            </span>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${normalizedStatus(instanceInfo?.status) === 'running' ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            disabled={loading || normalizedStatus(instanceInfo?.status) === 'running'}
            onClick={() => handleAction('start')}
          >
            {loading === 'start' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            disabled={loading || normalizedStatus(instanceInfo?.status) !== 'running'}
            onClick={() => handleAction('stop')}
          >
            {loading === 'stop' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            disabled={loading || normalizedStatus(instanceInfo?.status) !== 'running'}
            onClick={() => handleAction('restart')}
          >
            {loading === 'restart' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    </>
  );
}
