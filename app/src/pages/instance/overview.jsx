import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function InstanceOverview() {
  const { hostId, instanceName } = useParams();
  const [loading, setLoading] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [hostAddress, setHostAddress] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/hosts/${hostId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.address) {
          // Extract host/ip from address (strip protocol and port)
          try {
            const url = new URL(data.address);
            setHostAddress(url.hostname);
          } catch {
            setHostAddress(data.address);
          }
        }
      })
      .catch(() => setHostAddress(''));
  }, [hostId]);

  const handleAction = (action) => {
    setLoading(action);
    setResult(null);
    setError(null);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/${action}`, {
      method: 'POST',
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || `Failed to ${action} instance`);
        setResult(`${action.charAt(0).toUpperCase() + action.slice(1)} command sent!`);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(''));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h2 className="text-3xl font-bold text-blue-700 mb-4">Manage Instance</h2>
      <div className="bg-white rounded shadow p-6 w-full max-w-lg">
        <div className="mb-2 text-lg font-semibold">Host ID: {hostId}</div>
        <div className="mb-2 text-lg font-semibold">Instance Name: {instanceName}</div>
        <div className="flex gap-4 mt-6">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            disabled={loading === 'start'}
            onClick={() => handleAction('start')}
          >
            {loading === 'start' ? 'Starting...' : 'Start'}
          </button>
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded"
            disabled={loading === 'stop'}
            onClick={() => handleAction('stop')}
          >
            {loading === 'stop' ? 'Stopping...' : 'Stop'}
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={loading === 'restart'}
            onClick={() => handleAction('restart')}
          >
            {loading === 'restart' ? 'Restarting...' : 'Restart'}
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded"
            disabled={loading === 'delete'}
            // TODO: Wire up delete logic if needed
          >
            Delete
          </button>
          <button
            className="bg-gray-800 text-white px-4 py-2 rounded"
            onClick={() => navigate(`/instance/${hostId}/${encodeURIComponent(instanceName)}/console`)}
          >
            Console
          </button>
        </div>
        {error && <div className="text-red-500 mt-4">{error}</div>}
        {result && <div className="text-green-600 mt-4">{result}</div>}
        <div className="text-gray-500 mt-4">Instance details and actions coming soon...</div>
      </div>
    </div>
  );
}
