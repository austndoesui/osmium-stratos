import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import MainLayout from '../../components/mainlayout';
import InstanceHeader from '../../components/instance_header';
import { useNotification } from '../../providers/NotificationProvider';

export default function InstanceHistory() {
  const { hostId, instanceName } = useParams();
  const [loading, setLoading] = useState('');
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const navigate = useNavigate();
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);
  const notification = useNotification();
  const historyRefreshInterval = useRef(null);

  const fetchHistoryData = () => {
    if (!isMounted.current) return;
    
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/history`)
      .then(res => {
        console.log('History API response status:', res.status);
        return res.ok ? res.json() : [];
      })
      .then(data => {
        console.log('History API data:', data);
        if (isMounted.current) {
          setHistory(data || []);
          setLoadingHistory(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching history:', err);
        if (isMounted.current) {
          setHistory([]);
          setLoadingHistory(false);
        }
      });
  };

  useEffect(() => {
    isMounted.current = true;
    navMoved.current = false;
    
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
    
    setLoadingHistory(true);
    fetchHistoryData();
    
    historyRefreshInterval.current = setInterval(fetchHistoryData, 10000);
    
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
      if (historyRefreshInterval.current) {
        clearInterval(historyRefreshInterval.current);
      }
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
      });
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
                setTimeout(() => {
                  refreshInstanceInfo();
                  fetchHistoryData();
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
        }}
        navPlaceholderRef={navPlaceholderRef}
      />
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-medium text-white">Instance Logs</h2>
            </div>
            
            {loadingHistory ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Timestamp</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800">
                    {history.map((event, index) => (
                      <tr key={index} className="hover:bg-gray-700/30">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            event.action === 'start' ? 'bg-green-900/30 text-green-300' :
                            event.action === 'stop' ? 'bg-red-900/30 text-red-300' :
                            event.action === 'restart' ? 'bg-yellow-900/30 text-yellow-300' :
                            'bg-blue-900/30 text-blue-300'
                          }`}>
                            {event.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{event.username || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {`${event.action} operation performed`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/30 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-gray-400 font-medium">No history found</div>
                <p className="text-gray-500 text-sm mt-1">This instance has no recorded history</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
