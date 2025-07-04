import '../index.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
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
  const navigate = useNavigate();

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
        // Flatten the data for instance-centric view
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
        // Poll until the instance is gone
        pollUntilInstanceGone(hostId, name);
      })
      .catch(err => setError(err.message));
  };

  // Helper to check if an image is VM-capable (simple heuristic: 'ubuntu' in label or value)
  const isSelectedImageVMSupported = () => {
    const selected = imageOptions.find(img => img.value === form.imageAlias);
    if (!selected) return false;
    return /ubuntu/i.test(selected.label) || /ubuntu/i.test(selected.value);
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4 text-blue-600">Osmium-stratos</h1>
      <div className="mt-4 w-full max-w-2xl flex justify-end">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
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
          Refresh
        </button>
        <button className="ml-4 bg-green-600 text-white px-4 py-2 rounded" onClick={() => setShowModal(true)}>
          Create VM/Container
        </button>
      </div>
      <div className="mt-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">All VMs/Containers</h2>
        {loadingVMs ? (
          <p className="text-gray-500">Loading VMs...</p>
        ) : flatInstances.length === 0 ? (
          <p className="text-gray-500">No VMs or containers found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flatInstances.map(vm => (
              <div
                key={vm.name + vm.host.id}
                className="bg-white rounded shadow p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition"
                onClick={() => navigate(`/instance/${vm.host.id}/${vm.name}`)}
              >
                <div>
                  <div className="font-semibold text-lg">{vm.name}</div>
                  <div className="text-sm text-gray-600 mb-2">{vm.status}</div>
                  <div className="text-xs text-gray-500">
                    Host: {vm.host.name} ({vm.host.address})
                  </div>
                  <div className="text-xs text-gray-700 mt-1">
                    Type: {vm.type === 'virtual-machine' ? 'VM' : 'Container'}
                  </div>
                </div>
                <button
                  className="text-red-600 text-xl ml-4"
                  title="Delete instance"
                  onClick={e => { e.stopPropagation(); handleDelete(vm.host.id, vm.name); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowModal(false)}>&times;</button>
            <h2 className="text-2xl font-bold mb-4">Create VM/Container</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <label className="block mb-1">Host</label>
                <select name="hostId" value={form.hostId} onChange={handleChange} required className="w-full p-2 border rounded">
                  <option value="">Select a host</option>
                  {hosts.map(h => <option key={h.id} value={h.id}>{h.name} ({h.address})</option>)}
                </select>
              </div>
              <div className="mb-2">
                <label className="block mb-1">Type</label>
                <select name="type" value={form.type} onChange={handleChange} required className="w-full p-2 border rounded">
                  <option value="virtual-machine">VM</option>
                  <option value="container">Container</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="block mb-1">Instance Name</label>
                <input name="name" value={form.name} onChange={handleChange} required className="w-full p-2 border rounded" />
              </div>
              <div className="mb-2">
                <label className="block mb-1">Image</label>
                <select name="imageAlias" value={form.imageAlias} onChange={handleChange} required className="w-full p-2 border rounded">
                  <option value="">Select an image</option>
                  {imageOptions.map(img => <option key={img.value} value={img.value}>{img.label}</option>)}
                </select>
              </div>
              {form.type === 'virtual-machine' && form.imageAlias && !isSelectedImageVMSupported() && (
                <div className="text-yellow-600 text-sm mb-2">
                  Warning: Only certain images (e.g., Ubuntu cloud images) support VM creation. This image may not work for VMs.
                </div>
              )}
              {error && <div className="text-red-500 mb-2">{error}</div>}
              {result && <div className="text-green-600 mb-2">{result}</div>}
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
