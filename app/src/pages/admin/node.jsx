import { useEffect, useState } from 'react';

export default function AdminNode() {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [refreshingId, setRefreshingId] = useState(null);

  const fetchHosts = () => {
    setLoading(true);
    fetch('/api/hosts')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch hosts');
        return res.json();
      })
      .then((data) => {
        setHosts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
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
        setForm({ name: '', address: '', description: '', cert: '', key: '', ca: '' });
        fetchHosts();
      })
      .catch((err) => {
        setFormError(err.message);
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this host?')) return;
    setDeletingId(id);
    fetch(`/api/hosts/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete host');
        fetchHosts();
      })
      .catch((err) => {
        alert(err.message);
      })
      .finally(() => setDeletingId(null));
  };

  const handleRefresh = (id) => {
    setRefreshingId(id);
    setStatusMap((prev) => ({ ...prev, [id]: 'Checking...' }));
    fetch(`/api/hosts/${id}/verify`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'online') {
          setStatusMap((prev) => ({ ...prev, [id]: 'Online' }));
        } else {
          setStatusMap((prev) => ({ ...prev, [id]: 'Offline: ' + (data.error || 'Unknown error') }));
        }
      })
      .catch((err) => {
        setStatusMap((prev) => ({ ...prev, [id]: 'Error: ' + err.message }));
      })
      .finally(() => setRefreshingId(null));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h2 className="text-3xl font-bold text-green-700 mb-4">Osmium Hosts</h2>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md mb-8">
        <h3 className="text-xl font-semibold mb-2">Add Host</h3>
        <div className="mb-2">
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Name" className="w-full p-2 border rounded" />
        </div>
        <div className="mb-2">
          <input name="address" value={form.address} onChange={handleChange} required placeholder="LXD Node IP (e.g. 1.2.3.4)" className="w-full p-2 border rounded" />
          <div className="text-xs text-gray-500 mt-1">Just enter the IP. The panel will use <span className="font-mono">https://IP:8443</span> automatically.</div>
        </div>
        <div className="mb-2">
          <input name="description" value={form.description} onChange={handleChange} placeholder="Description" className="w-full p-2 border rounded" />
        </div>
        <div className="mb-2">
          <textarea name="cert" value={form.cert} onChange={handleChange} placeholder="Client Certificate (PEM)" className="w-full p-2 border rounded" rows={2} />
        </div>
        <div className="mb-2">
          <textarea name="key" value={form.key} onChange={handleChange} placeholder="Client Key (PEM)" className="w-full p-2 border rounded" rows={2} />
        </div>
        <div className="mb-2">
          <textarea name="ca" value={form.ca} onChange={handleChange} placeholder="CA Certificate (PEM, optional)" className="w-full p-2 border rounded" rows={2} />
        </div>
        {formError && <div className="text-red-500 mb-2">{formError}</div>}
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Host'}
        </button>
      </form>
      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="mt-6 p-4 bg-white rounded shadow w-full max-w-md">
          {hosts.length === 0 ? (
            <p className="text-gray-700">No hosts found.</p>
          ) : (
            <ul className="space-y-2">
              {hosts.map((host) => (
                <li key={host.id} className="border-b pb-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{host.name}</div>
                    <div className="text-gray-600 text-sm">{host.address}</div>
                    {host.description && <div className="text-gray-500 text-xs mt-1">{host.description}</div>}
                    <div className="text-xs mt-1">
                      Status: {statusMap[host.id] || 'Unknown'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      className="ml-4 bg-blue-500 text-white px-2 py-1 rounded text-xs"
                      onClick={() => handleRefresh(host.id)}
                      disabled={refreshingId === host.id}
                    >
                      {refreshingId === host.id ? 'Checking...' : 'Refresh'}
                    </button>
                    <button
                      className="ml-4 bg-red-500 text-white px-2 py-1 rounded text-xs"
                      onClick={() => handleDelete(host.id)}
                      disabled={deletingId === host.id}
                    >
                      {deletingId === host.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
