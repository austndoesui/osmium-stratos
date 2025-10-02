import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import InstanceHeader from '../../components/instance_header';
import { useNotification } from '../../providers/NotificationProvider';

function Snapshots() {
  const { hostId, instanceName } = useParams();
  const [loading, setLoading] = useState('');
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);
  const navigate = useNavigate();
  const notification = useNotification();

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
    
   
    setLoadingSnapshots(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/snapshots`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (isMounted.current) {
          setSnapshots(data || []);
          setLoadingSnapshots(false);
        }
      })
      .catch(err => {
        if (isMounted.current) {
          console.error('Error fetching snapshots:', err);
          setSnapshots([]);
          setLoadingSnapshots(false);
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

  const refreshSnapshots = () => {
    if (!isMounted.current) return;
    
    setLoadingSnapshots(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/snapshots`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (isMounted.current) {
          setSnapshots(data || []);
          setLoadingSnapshots(false);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setSnapshots([]);
          setLoadingSnapshots(false);
        }
      });
  };

  const handleCreateSnapshot = () => {
  fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/snapshots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `snapshot-${Date.now()}`
    })
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(data => {
          throw new Error(data.error || 'Failed to create snapshot');
        });
      }
      return res.json();
    })
    .then(() => {
      notification.showSuccess('Snapshot created successfully');
      refreshSnapshots();
    })
    .catch(err => {
      notification.showError(err.message || 'Failed to create snapshot');
    });
};

  const handleRestoreSnapshot = (snapshotId) => {
    if (!window.confirm('Are you sure you want to restore this snapshot? This will overwrite the current state of your instance.')) {
      return;
    }
  fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/snapshots/${snapshotId}/restore`, {
    method: 'POST'
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(data => {
          throw new Error(data.error || 'Failed to restore snapshot');
        });
      }
      return res.json();
    })
    .then(() => {
      notification.showSuccess('Snapshot restored successfully');
      setTimeout(() => {
        refreshInstanceInfo();
        refreshSnapshots();
      }, 2000);
    })
    .catch(err => {
      notification.showError(err.message || 'Failed to restore snapshot');
    });
};

  const handleDeleteSnapshot = (snapshotId) => {
    if (!window.confirm('Are you sure you want to delete this snapshot?')) {
      return;
    }
    
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/snapshots/${snapshotId}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.error || 'Failed to delete snapshot');
          });
        }
        return res.json();
      })
      .then(() => {
        notification.showSuccess('Snapshot deleted successfully');
        refreshSnapshots();
      })
      .catch(err => {
        notification.showError(err.message || 'Failed to delete snapshot');
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
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-medium text-white">Snapshots</h2>
              <button 
                className="bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer"
                onClick={handleCreateSnapshot}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create Snapshot
              </button>
            </div>
            
            {loadingSnapshots ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : snapshots.length === 0 ? (
              <div className="p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" />
                  <path fillRule="evenodd" d="m3.087 9 .54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087Zm6.163 3.75A.75.75 0 0 1 10 12h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-medium text-gray-300 mb-1">No snapshots available</h3>
                <p className="text-gray-400">Create a snapshot to save the current state of your instance.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800">
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="hover:bg-gray-700/30">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{snapshot.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {new Date(snapshot.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {snapshot.size ? `${(snapshot.size / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="text-blue-400 hover:text-blue-300 transition-colors mr-4"
                            onClick={() => handleRestoreSnapshot(snapshot.id)}
                          >
                            Restore
                          </button>
                          <button 
                            className="text-red-400 hover:text-red-300 transition-colors"
                            onClick={() => handleDeleteSnapshot(snapshot.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Snapshots;
