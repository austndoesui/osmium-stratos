import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import { useNotification } from '../../providers/NotificationProvider';

export default function AdminInstances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [hosts, setHosts] = useState([]);
  const [form, setForm] = useState({ hostId: '', name: '', imageAlias: '', type: 'virtual-machine', cpu: '', ram: '', disk: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [imageOptions, setImageOptions] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const modalRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const userSearchTimeout = useRef(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchInstances();
  }, []);

  useEffect(() => {
    fetch('/api/hosts')
      .then(res => res.json())
      .then(setHosts)
      .catch(() => setHosts([]));
  }, [showModal]);

  useEffect(() => {
    fetch('/api/images')
      .then(res => res.json())
      .then(setImageOptions)
      .catch(() => setImageOptions([]));
  }, []);

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

  useEffect(() => {
    if (!userQuery) {
      setUserResults([]);
      setUserSearchLoading(false);
      return;
    }
    setUserSearchLoading(true);
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    userSearchTimeout.current = setTimeout(() => {
      fetch('/api/users')
        .then(res => res.json())
        .then(users => {
          const q = userQuery.toLowerCase();
          setUserResults(users.filter(u =>
            u.username.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
          ));
        })
        .catch(() => setUserResults([]))
        .finally(() => setUserSearchLoading(false));
    }, 300);
    return () => {
      if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    };
  }, [userQuery]);

  useEffect(() => {
    if (showModal) {
      setSelectedUser(null);
      setUserQuery('');
    }
  }, [showModal]);

  const fetchInstances = () => {
    setLoading(true);
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
        setInstances(allInstances);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching instances:', err);
        setError('Failed to load instances. Please try again later.');
      })
      .finally(() => setLoading(false));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    console.log('[Instance Creation] selectedUser:', selectedUser);
    fetch(`/api/hosts/${form.hostId}/vms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        imageAlias: form.imageAlias,
        type: form.type,
        user_id: selectedUser ? selectedUser.id : null,
        cpu: form.cpu ? Number(form.cpu) : undefined,
        ram: form.ram ? Number(form.ram) * 1073741824 : undefined,
        disk: form.disk ? Number(form.disk) * 1073741824 : undefined,
      }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to create instance');
        showSuccess('Instance creation started!');
        setForm({ hostId: '', name: '', imageAlias: '', type: 'virtual-machine', cpu: '', ram: '', disk: '' });
        setSelectedUser(null);
        setUserQuery('');
        setShowModal(false);
        fetchInstances();
      })
      .catch(err => {
        showError(err.message);
        setError(err.message);
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (hostId, name) => {
    if (!window.confirm(`Delete instance '${name}'?`)) return;
    
    setLoading(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete instance');
        showSuccess(`Instance '${name}' deleted successfully`);
        if (selectedUser && instances.find(i => i.name === name && i.host.id === hostId && i.owner && i.owner.username === selectedUser.username)) {
          setSelectedUser(null);
          setUserQuery('');
        }
        fetchInstances();
      })
      .catch(err => {
        showError(err.message);
        setError(err.message);
        setLoading(false);
      });
  };

  const isSelectedImageVMSupported = () => {
    const selected = imageOptions.find(img => img.value === form.imageAlias);
    if (!selected) return false;
    return /ubuntu/i.test(selected.label) || /ubuntu/i.test(selected.value);
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6">
        <div className="mb-4">
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
                  <Link to="/admin" className="text-sm text-gray-400 hover:text-white ml-1 md:ml-2">
                    Admin
                  </Link>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">Instances</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Instance Management</h1>
          <p className="text-base text-gray-400">View and manage all instances across hosts</p>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={fetchInstances}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
          </div>
          <div className="relative">
            <button 
              ref={buttonRef}
              className="bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer"
              onClick={() => setShowModal(!showModal)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create instance
            </button>
            
            {showModal && (
              <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                <div 
                  ref={modalRef}
                  className="bg-gray-800 rounded-lg shadow-xl w-96 border border-gray-700"
                  style={{ animation: 'fadeInDown 0.2s ease-out forwards' }}
                >
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-medium text-white">Create Instance</h3>
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
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">CPU Cores</label>
                          <input 
                            type="number"
                            name="cpu" 
                            min="1"
                            value={form.cpu}
                            onChange={handleChange}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Memory (GiB)</label>
                          <input 
                            type="number"
                            name="ram" 
                            min="1"
                            value={form.ram}
                            onChange={handleChange}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Storage (GiB)</label>
                          <input 
                            type="number"
                            name="disk" 
                            min="1"
                            value={form.disk}
                            onChange={handleChange}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          />
                        </div>
                      </div>
                      
                      {form.type === 'virtual-machine' && form.imageAlias && !isSelectedImageVMSupported() && (
                        <div className="text-yellow-400 text-sm">
                          Warning: Only certain images (e.g., Ubuntu cloud images) support VM creation. This image may not work for VMs.
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Instance Owner</label>
                        <input
                          type="text"
                          placeholder="Type username or email..."
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          value={userQuery}
                          onChange={e => {
                            setUserQuery(e.target.value);
                            setSelectedUser(null);
                          }}
                          autoComplete="off"
                        />
                        {userSearchLoading && (
                          <div className="text-gray-400 text-xs mt-1">Searching...</div>
                        )}
                        {!selectedUser && userQuery && userResults.length > 0 && (
                          <div className="bg-gray-900 border border-gray-700 rounded-md mt-1 max-h-40 overflow-y-auto z-50">
                            {userResults.map(u => (
                              <div
                                key={u.id}
                                className="px-4 py-2 text-gray-200 hover:bg-gray-700 cursor-pointer text-sm"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setUserQuery(`${u.username} (${u.email})`);
                                }}
                              >
                                {u.username} <span className="text-gray-400">({u.email})</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedUser && (
                          <div className="text-green-400 text-xs mt-1">Selected: {selectedUser.username} ({selectedUser.email})</div>
                        )}
                      </div>
                      
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
                          {submitting ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">All Instances</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-10 w-10 relative">
                <div className="absolute inset-0 border-2 border-gray-700 rounded-full"></div>
                <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-400 mt-3">Loading instances...</p>
            </div>
          ) : instances.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-400">No instances found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Host</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Owner</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800">
                  {instances.map((instance, index) => (
                    <tr key={`${instance.host.id}-${instance.name}`} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{instance.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{instance.host.name}</div>
                        {/* <div className="text-xs text-gray-400">{instance.host.address}</div> */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          instance.type === 'virtual-machine' ? 'bg-blue-900/30 text-blue-300' : 'bg-purple-900/30 text-purple-300'
                        }`}>
                          {instance.type === 'virtual-machine' ? 'VM' : 'Container'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          instance.status === 'Running' ? 'bg-green-900/30 text-green-300' : 
                          instance.status === 'Stopped' ? 'bg-red-900/30 text-red-300' : 
                          'bg-yellow-900/30 text-yellow-300'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            instance.status === 'Running' ? 'bg-green-400' : 
                            instance.status === 'Stopped' ? 'bg-red-400' : 
                            'bg-yellow-400'
                          } mr-1.5`}></span>
                          {instance.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {instance.owner ? (
                          <span className="text-sm text-gray-200">{instance.owner.username} <span className="text-xs text-gray-400">({instance.owner.email})</span></span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-white hover:text-gray-300 mr-3 transition-colors cursor-pointer"
                          onClick={() => navigate(`/instance/${instance.host.id}/${instance.name}`)}
                        >
                          View
                        </button>
                        <button
                          className={`text-red-400 hover:text-red-300 transition-colors cursor-pointer ${instance.status === 'Running' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => handleDelete(instance.host.id, instance.name)}
                          disabled={instance.status === 'Running'}
                          title={instance.status === 'Running' ? 'Cannot delete a running instance. Stop it first.' : ''}
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
          
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing <span className="font-medium text-white">{instances.length > 0 ? `1-${instances.length}` : '0'}</span> of <span className="font-medium text-white">{instances.length}</span> instances
            </div>
          </div>
        </div>
      </div>

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
