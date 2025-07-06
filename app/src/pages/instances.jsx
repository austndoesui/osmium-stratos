import '../index.css';
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import MainLayout from '../components/mainlayout';

function Instances() {
  const [showModal, setShowModal] = useState(false);
  const [hosts, setHosts] = useState([]);
  const [form, setForm] = useState({ hostId: '', name: '', imageAlias: '', type: 'virtual-machine' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [vms, setVMs] = useState([]);
  const [flatInstances, setFlatInstances] = useState([]);
  const [loadingVMs, setLoadingVMs] = useState(true);
  const [imageOptions, setImageOptions] = useState([]);
  const [gridLayout, setGridLayout] = useState(() => {
    // Load saved layout preference from localStorage, default to 'full' if not found
    const savedLayout = localStorage.getItem('instancesGridLayout');
    // If the saved layout is 'default' (which is no longer used), convert it to 'wide'
    if (savedLayout === 'default') return 'wide';
    return savedLayout || 'full'; // 'wide' (2 cards) or 'full' (1 card)
  });
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);

  useEffect(() => {
    fetch('/api/hosts')
      .then(res => res.json())
      .then(setHosts)
      .catch(() => setHosts([]));
  }, [showModal]);

  useEffect(() => {
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

  useEffect(() => {
    fetch('/api/images')
      .then(res => res.json())
      .then(setImageOptions)
      .catch(() => setImageOptions([]));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError(null);
    fetch(`/api/hosts/${form.hostId}/vms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, imageAlias: form.imageAlias, type: form.type }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to create instance');
        setResult('Instance creation started!');
        setForm({ hostId: '', name: '', imageAlias: '', type: 'virtual-machine' });
      })
      .catch(err => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  const pollUntilInstanceGone = (hostId, name, maxAttempts = 20, interval = 1000) => {
    let attempts = 0;
    const poll = () => {
      fetch('/api/vms')
        .then(res => res.json())
        .then(data => {
          const allInstances = [];
          data.forEach(({ host, vms }) => {
            if (Array.isArray(vms)) {
              vms.forEach(vm => {
                allInstances.push({ ...vm, host });
              });
            }
          });
          setVMs(data);
          setFlatInstances(allInstances);
          const stillExists = allInstances.some(vm => vm.name === name && vm.host.id === hostId);
          if (!stillExists || attempts >= maxAttempts) {
            setLoadingVMs(false);
          } else {
            attempts++;
            setTimeout(poll, interval);
          }
        })
        .catch(() => {
          setVMs([]);
          setFlatInstances([]);
          setLoadingVMs(false);
        });
    };
    setLoadingVMs(true);
    poll();
  };

  const handleDelete = (hostId, name) => {
    if (!window.confirm(`Delete instance '${name}'?`)) return;
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete instance');
        pollUntilInstanceGone(hostId, name);
      })
      .catch(err => setError(err.message));
  };

  const isSelectedImageVMSupported = () => {
    const selected = imageOptions.find(img => img.value === form.imageAlias);
    if (!selected) return false;
    return /ubuntu/i.test(selected.label) || /ubuntu/i.test(selected.value);
  };

  // Filter instances to only those assigned to the current user
  const userInstances = flatInstances.filter(vm => {
    if (!vm.owner || !user) return false;
    return (
      (vm.owner.username && vm.owner.username === user.username) ||
      (vm.owner.email && vm.owner.email === user.email)
    );
  });

  const instancesContent = (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-medium text-white">Your Instances</h2>
        <div className="flex space-x-3">
          {/* Layout toggle buttons */}
          <div className="flex bg-gray-800 rounded-md mr-2 border border-gray-700 relative group">
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {gridLayout === 'wide' ? 'Two cards per row' : 'Two card per row'}
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
          {userInstances.map(vm => (
            <div
              key={vm.name + vm.host.id}
              className={`bg-gray-800 rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-750 transition ${
                gridLayout === 'full' ? 'flex flex-row items-center p-5' : 'flex flex-col p-4'
              }`}
              onClick={() => navigate(`/instance/${vm.host.id}/${vm.name}`)}
            >
              {gridLayout === 'full' ? (
                <>
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <div className="font-medium text-lg text-white mr-3">{vm.name}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        vm.status === 'Running' ? 'bg-green-900/40 text-green-400' : 
                        vm.status === 'Stopped' ? 'bg-red-900/40 text-red-400' : 
                        'bg-yellow-900/40 text-yellow-400'
                      }`}>
                        {vm.status}
                      </div>
                    </div>
                                         <div className="flex flex-wrap mt-1 text-sm text-gray-400">
                      <div className="flex items-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                        </svg>
                        Host: {vm.host.name}
                      </div>
                      <div className="flex items-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        Type: {vm.type === 'virtual-machine' ? 'VM' : 'Container'}
                      </div>
                      {vm.ipv4 && (
                        <div className="flex items-center mr-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          IP: {vm.ipv4}
                        </div>
                      )}
                      {vm.image && (
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Image: {vm.image.split('/').pop()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex">
                    <button
                      className="text-gray-400 hover:text-white p-2 bg-gray-700 hover:bg-gray-600 rounded-l-md transition-colors"
                      title="View instance details"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/instance/${vm.host.id}/${vm.name}`);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      className="text-gray-400 hover:text-red-400 p-2 bg-gray-700 hover:bg-gray-600 rounded-r-md transition-colors border-l border-gray-600"
                      title="Delete instance"
                      onClick={e => { e.stopPropagation(); handleDelete(vm.host.id, vm.name); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-lg text-white">{vm.name}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      vm.status === 'Running' ? 'bg-green-900/40 text-green-400' : 
                      vm.status === 'Stopped' ? 'bg-red-900/40 text-red-400' : 
                      'bg-yellow-900/40 text-yellow-400'
                    }`}>
                      {vm.status}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 mt-1">
                    <div className="flex items-center mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                      </svg>
                      Host: {vm.host.name}
                    </div>
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      Type: {vm.type === 'virtual-machine' ? 'VM' : 'Container'}
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-3 flex justify-end">
                    <button
                      className="text-gray-400 hover:text-red-400 p-1"
                      title="Delete instance"
                      onClick={e => { e.stopPropagation(); handleDelete(vm.host.id, vm.name); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-white">Create VM/Container</h3>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={() => setShowModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Host</label>
                <select 
                  name="hostId" 
                  value={form.hostId} 
                  onChange={handleChange} 
                  required 
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <option value="">Select a host</option>
                  {hosts.map(h => <option key={h.id} value={h.id}>{h.name} ({h.address})</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select 
                  name="type" 
                  value={form.type} 
                  onChange={handleChange} 
                  required 
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <option value="virtual-machine">VM</option>
                  <option value="container">Container</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Instance Name</label>
                <input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  required 
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Image</label>
                <select 
                  name="imageAlias" 
                  value={form.imageAlias} 
                  onChange={handleChange} 
                  required 
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <option value="">Select an image</option>
                  {imageOptions.map(img => <option key={img.value} value={img.value}>{img.label}</option>)}
                </select>
              </div>
              
              {form.type === 'virtual-machine' && form.imageAlias && !isSelectedImageVMSupported() && (
                <div className="text-yellow-400 text-sm">
                  Warning: Only certain images (e.g., Ubuntu cloud images) support VM creation. This image may not work for VMs.
                </div>
              )}
              
              {error && (
                <div className="bg-red-900/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}
              
              {result && (
                <div className="bg-green-900/40 border border-green-500/50 text-green-200 px-4 py-3 rounded-md">
                  {result}
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  return <MainLayout>{instancesContent}</MainLayout>;
}

export default Instances;
