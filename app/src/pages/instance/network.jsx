import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import MainLayout from '../../components/mainlayout';
import InstanceHeader from '../../components/instance_header';
import { useNotification } from '../../providers/NotificationProvider';

export default function InstanceNetwork() {
  const { hostId, instanceName } = useParams();
  const [loading, setLoading] = useState('');
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [redirects, setRedirects] = useState([]);
  const [loadingRedirects, setLoadingRedirects] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vm_port: '', protocol: 'tcp' });
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);
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
    
    setLoadingRedirects(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/redirects`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (isMounted.current) {
          setRedirects(data || []);
          setLoadingRedirects(false);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setRedirects([]);
          setLoadingRedirects(false);
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
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal]);

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/redirects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ container_port: form.vm_port, protocol: form.protocol }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to add port forwarding');
        notification.showSuccess('Port forwarding added successfully!');
        setForm({ vm_port: '', protocol: 'tcp' });
        setShowModal(false);
        fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/redirects`)
          .then(res => res.ok ? res.json() : [])
          .then(data => {
            if (isMounted.current) {
              setRedirects(data || []);
            }
          })
          .catch(() => {
            // Silently fail
          });
      })
      .catch(err => {
        notification.showError(err.message);
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this port forwarding rule?')) return;
    
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/redirects/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to delete port forwarding');
        }
        notification.showSuccess('Port forwarding deleted successfully!');
        setRedirects(redirects => redirects.filter(r => r.id !== id));
      })
      .catch(err => {
        notification.showError(err.message);
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
              <h2 className="text-lg font-medium text-white">Network Allocations</h2>
              <button 
                ref={buttonRef}
                className="bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer"
                onClick={() => setShowModal(!showModal)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Allocation
              </button>
            </div>
            
            {loadingRedirects ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : redirects.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Forwarded Port</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Container Port</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Protocol</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800">
                      {redirects.map((redirect, index) => (
                        <tr key={index} className="hover:bg-gray-700/30">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{redirect.host_port}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{redirect.vm_port}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              redirect.protocol === 'udp' ? 'bg-purple-900/30 text-purple-300' : 'bg-blue-900/30 text-blue-300'
                            }`}>
                              {redirect.protocol || 'tcp'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              className="text-red-400 hover:text-red-300 transition-colors"
                              onClick={() => handleDelete(redirect.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing <span className="font-medium text-white">{redirects.length > 0 ? `1-${redirects.length}` : '0'}</span> of <span className="font-medium text-white">{redirects.length}</span> allocations
                  </div>
                  <div className="flex space-x-1">
                    <button className="px-2 py-1 border border-gray-600 rounded-md text-gray-400 text-sm disabled:opacity-50" disabled>
                      Previous
                    </button>
                    <button className="px-2 py-1 border border-gray-600 rounded-md text-gray-400 text-sm disabled:opacity-50" disabled>
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/30 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div className="text-gray-400 font-medium">No allocations found</div>
                <p className="text-gray-500 text-sm mt-1">Add an allocation to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div 
            ref={modalRef}
            className="bg-gray-800 rounded-lg shadow-xl w-96 border border-gray-700"
            style={{ animation: 'fadeInDown 0.2s ease-out forwards' }}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Add Port Forwarding</h3>
              <button 
                className="text-gray-400 hover:text-white cursor-pointer"
                onClick={() => setShowModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Container Port</label>
                  <input 
                    type="number"
                    name="vm_port" 
                    value={form.vm_port} 
                    onChange={handleChange} 
                    required 
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                    placeholder="e.g., 22"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Protocol</label>
                  <select 
                    name="protocol" 
                    value={form.protocol} 
                    onChange={handleChange} 
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {submitting ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </MainLayout>
  );
}