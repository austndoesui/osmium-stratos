import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import { useNotification } from '../../providers/NotificationProvider';

export default function AdminNode() {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    description: '',
    cert: '',
    key: '',
    ca: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [checkingStatuses, setCheckingStatuses] = useState(false);
  const [instanceCounts, setInstanceCounts] = useState({});
  const modalRef = useRef(null);
  const buttonRef = useRef(null);
  const { showSuccess, showError } = useNotification();

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

  const fetchInstanceCounts = (hostsData) => {
    if (!hostsData || hostsData.length === 0) return;
    const counts = {};
    let completed = 0;
    hostsData.forEach(host => {
      fetch(`/api/hosts/${host.id}/instance-count`)
        .then(res => res.json())
        .then(data => {
          counts[host.id] = data.count;
        })
        .catch(() => {
          counts[host.id] = 0;
        })
        .finally(() => {
          completed++;
          if (completed === hostsData.length) {
            setInstanceCounts(counts);
          }
        });
    });
  };

  const fetchHosts = () => {
    setLoading(true);
    fetch('/api/hosts')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch hosts');
        return res.json();
      })
      .then((data) => {
        setHosts(data);
        setError(null);
        checkAllHostStatuses(data);
        fetchInstanceCounts(data);
      })
      .catch((err) => {
        showError('Failed to fetch hosts: ' + err.message);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  const checkAllHostStatuses = async (hostsData) => {
    if (!hostsData || hostsData.length === 0) return;
    
    setCheckingStatuses(true);
    const newStatusMap = { ...statusMap };
    
    // Set all statuses to "Checking..." initially
    hostsData.forEach(host => {
      newStatusMap[host.id] = 'Checking...';
    });
    setStatusMap(newStatusMap);
    
    // Check each host status
    for (const host of hostsData) {
      try {
        const res = await fetch(`/api/hosts/${host.id}/verify`, { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'online') {
          newStatusMap[host.id] = 'Online';
        } else {
          newStatusMap[host.id] = 'Offline: ' + (data.error || 'Unknown error');
          showError(`Host ${host.name} is offline: ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        newStatusMap[host.id] = 'Error: ' + err.message;
        showError(`Failed to check host ${host.name}: ${err.message}`);
      }
      
      // Update status map after each host check
      setStatusMap({ ...newStatusMap });
    }
    
    setCheckingStatuses(false);
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    
    fetch('/api/hosts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then((res) => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Failed to add host'); });
        return res.json();
      })
      .then(() => {
        showSuccess('Host added successfully');
        setForm({ name: '', address: '', description: '', cert: '', key: '', ca: '' });
        fetchHosts();
        setShowModal(false);
      })
      .catch((err) => {
        showError(err.message);
        setFormError(err.message);
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this host?')) return;
    setDeletingId(id);
    const hostName = hosts.find(h => h.id === id)?.name || 'Unknown host';
    
    fetch(`/api/hosts/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete host');
        showSuccess(`Host '${hostName}' deleted successfully`);
        fetchHosts();
      })
      .catch((err) => {
        showError(`Failed to delete host '${hostName}': ${err.message}`);
        setError(err.message);
      })
      .finally(() => setDeletingId(null));
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
                  <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">Hosts</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Host Management</h1>
          <p className="text-base text-gray-400">View and manage Osmium hosts</p>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={fetchHosts}
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
              Add Host
            </button>
            
            {showModal && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                <div 
                  ref={modalRef}
                  className="bg-gray-800 rounded-lg shadow-xl w-96 border border-gray-700 max-h-[90vh] flex flex-col"
                  style={{ animation: 'fadeInDown 0.2s ease-out forwards' }}
                >
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-medium text-white">Add Host</h3>
                    <button 
                      className="text-gray-400 hover:text-white cursor-pointer"
                      onClick={() => setShowModal(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                        <input 
                          name="name" 
                          value={form.name} 
                          onChange={handleChange} 
                          required 
                          placeholder="Host name"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                        <input 
                          name="address" 
                          value={form.address} 
                          onChange={handleChange} 
                          required 
                          placeholder="LXD Node IP (e.g. 1.2.3.4)"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        />
                        <div className="text-xs text-gray-400 mt-1">Just enter the IP. The panel will use <span className="font-mono">https://IP:8443</span> automatically.</div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
                        <input 
                          name="description" 
                          value={form.description} 
                          onChange={handleChange} 
                          placeholder="Description"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Client Certificate (PEM)</label>
                        <textarea 
                          name="cert" 
                          value={form.cert} 
                          onChange={handleChange} 
                          required
                          placeholder="-----BEGIN CERTIFICATE-----"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Client Key (PEM)</label>
                        <textarea 
                          name="key" 
                          value={form.key} 
                          onChange={handleChange} 
                          required
                          placeholder="-----BEGIN PRIVATE KEY-----"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">CA Certificate (PEM, Optional)</label>
                        <textarea 
                          name="ca" 
                          value={form.ca} 
                          onChange={handleChange} 
                          placeholder="-----BEGIN CERTIFICATE-----"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          rows={3}
                        />
                      </div>
                      
                      {formError && (
                        <div className="bg-red-900/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md">
                          {formError}
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
                          {submitting ? 'Adding...' : 'Add Host'}
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
            <h2 className="text-lg font-medium text-white">All Hosts</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-10 w-10 relative">
                <div className="absolute inset-0 border-2 border-gray-700 rounded-full"></div>
                <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-400 mt-3">Loading hosts...</p>
            </div>
          ) : hosts.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" />
                <path d="m3.265 10.602 7.668 4.129a2.25 2.25 0 0 0 2.134 0l7.668-4.13 1.37.739a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.71 0l-9.75-5.25a.75.75 0 0 1 0-1.32l1.37-.738Z" />
                <path d="m10.933 19.231-7.668-4.13-1.37.739a.75.75 0 0 0 0 1.32l9.75 5.25c.221.12.489.12.71 0l9.75-5.25a.75.75 0 0 0 0-1.32l-1.37-.738-7.668 4.13a2.25 2.25 0 0 1-2.134-.001Z" />
              </svg>
              <p className="text-gray-400">No hosts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Instances</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800">
              {hosts.map((host) => (
                    <tr key={host.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{host.name}</div>
                        {host.description && <div className="text-xs text-gray-400">{host.description}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{typeof instanceCounts[host.id] === 'number' ? instanceCounts[host.id] : '...'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusMap[host.id] === 'Online' ? 'bg-green-900/30 text-green-300' : 
                          statusMap[host.id]?.startsWith('Offline') ? 'bg-red-900/30 text-red-300' : 
                          statusMap[host.id]?.startsWith('Error') ? 'bg-red-900/30 text-red-300' :
                          statusMap[host.id] === 'Checking...' ? 'bg-yellow-900/30 text-yellow-300' :
                          'bg-gray-900/30 text-gray-300'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            statusMap[host.id] === 'Online' ? 'bg-green-400' : 
                            statusMap[host.id]?.startsWith('Offline') ? 'bg-red-400' : 
                            statusMap[host.id]?.startsWith('Error') ? 'bg-red-400' :
                            statusMap[host.id] === 'Checking...' ? 'bg-yellow-400' :
                            'bg-gray-400'
                          } mr-1.5`}></span>
                          {statusMap[host.id] || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                          className={`text-red-400 hover:text-red-300 transition-colors cursor-pointer ${deletingId === host.id || instanceCounts[host.id] > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleDelete(host.id)}
                      disabled={deletingId === host.id || instanceCounts[host.id] > 0}
                      title={instanceCounts[host.id] > 0 ? 'Cannot delete host with active instances' : ''}
                    >
                      {deletingId === host.id ? 'Deleting...' : 'Delete'}
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
              Showing <span className="font-medium text-white">{hosts.length > 0 ? `1-${hosts.length}` : '0'}</span> of <span className="font-medium text-white">{hosts.length}</span> hosts
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
