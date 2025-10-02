import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import InstanceHeader from '../../components/instance_header';
import { useNotification } from '../../providers/NotificationProvider';
import { AuthContext } from '../../App';
import { useContext } from 'react';

export default function Resize() {
  const { hostId, instanceName } = useParams();
  const [loading, setLoading] = useState('');
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [dbConfig, setDbConfig] = useState(null);
  const [loadingDbConfig, setLoadingDbConfig] = useState(true);
  const [form, setForm] = useState({ cpu: '', ram: '', disk: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate(`/instance/${hostId}/${instanceName}`);
    }
  }, [user, hostId, instanceName, navigate]);

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

    setLoadingDbConfig(true);
    fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/config`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (isMounted.current && data) {
          setDbConfig(data);
          setForm({
            cpu: data.cpu || '',
            ram: data.ram ? (Number(data.ram) / 1073741824).toString() : '',
            disk: data.disk ? (Number(data.disk) / 1073741824).toString() : ''
          });
          setLoadingDbConfig(false);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setDbConfig(null);
          setLoadingDbConfig(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'admin') return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu: form.cpu ? Number(form.cpu) : undefined,
          ram: form.ram ? Number(form.ram) * 1073741824 : undefined,
          disk: form.disk ? Number(form.disk) * 1073741824 : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to resize instance');
      }

      showSuccess('Instance resized successfully');
      navigate(`/instance/${hostId}/${instanceName}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = (action) => {
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
      .then(() => {
        showSuccess(`${action.charAt(0).toUpperCase() + action.slice(1)} command sent!`);
      })
      .catch(err => {
        showError(err.message);
      });
  };

  if (user && user.role !== 'admin') {
    return null;
  }

  return (
    <MainLayout>
      <InstanceHeader
        instanceName={instanceName}
        hostId={hostId}
        instanceInfo={instanceInfo}
        loadingInfo={loadingInfo}
        loading={loading}
        onAction={handleAction}
        navPlaceholderRef={navPlaceholderRef}
      />

      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-700">
          <h2 className="text-lg font-medium text-white">Resize Instance</h2>
        </div>
        <div className="p-6 bg-gray-850">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="cpu" className="text-sm font-medium text-gray-300">
                  CPU Cores
                </label>
                <div className="text-sm text-gray-400">
                  Current: <span className="text-white">{dbConfig?.cpu || '?'}</span>
                  {form.cpu && form.cpu !== dbConfig?.cpu?.toString() && (
                    <> → <span className="text-green-400">{form.cpu}</span></>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="range"
                  id="cpu"
                  name="cpu"
                  min="1"
                  max="32"
                  step="1"
                  value={form.cpu}
                  onChange={handleChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>8</span>
                  <span>16</span>
                  <span>24</span>
                  <span>32</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="ram" className="text-sm font-medium text-gray-300">
                  Memory (GiB)
                </label>
                <div className="text-sm text-gray-400">
                  Current: <span className="text-white">
                    {dbConfig?.ram ? (Number(dbConfig.ram) / 1073741824).toFixed(1) : '?'}
                  </span>
                  {form.ram && form.ram !== (dbConfig?.ram ? (Number(dbConfig.ram) / 1073741824).toString() : '') && (
                    <> → <span className="text-green-400">{Number(form.ram).toFixed(1)}</span></>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="range"
                  id="ram"
                  name="ram"
                  min="1"
                  max="128"
                  step="0.5"
                  value={form.ram}
                  onChange={handleChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>32</span>
                  <span>64</span>
                  <span>96</span>
                  <span>128</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="disk" className="text-sm font-medium text-gray-300">
                  Storage (GiB)
                </label>
                <div className="text-sm text-gray-400">
                  Current: <span className="text-white">
                    {dbConfig?.disk ? (Number(dbConfig.disk) / 1073741824).toFixed(1) : '?'}
                  </span>
                  {form.disk && form.disk !== (dbConfig?.disk ? (Number(dbConfig.disk) / 1073741824).toString() : '') && (
                    <> → <span className="text-green-400">{Number(form.disk).toFixed(1)}</span></>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="range"
                  id="disk"
                  name="disk"
                  min="10"
                  max="1000"
                  step="10"
                  value={form.disk}
                  onChange={handleChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10</span>
                  <span>250</span>
                  <span>500</span>
                  <span>750</span>
                  <span>1000</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => navigate(`/instance/${hostId}/${instanceName}`)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer border border-gray-600"
              >
                Cancel
              </button>
              <div className={instanceInfo?.status === 'Running' ? 'opacity-60 relative group' : ''}>
                <button
                  type="submit"
                  disabled={submitting || instanceInfo?.status === 'Running' || 
                    (form.cpu === (dbConfig?.cpu?.toString() || '') && 
                    form.ram === (dbConfig?.ram ? (Number(dbConfig.ram) / 1073741824).toString() : '') &&
                    form.disk === (dbConfig?.disk ? (Number(dbConfig.disk) / 1073741824).toString() : ''))}
                  className={`px-5 py-2.5 text-sm rounded-md focus:outline-none transition-colors ${
                    submitting || instanceInfo?.status === 'Running' || 
                    (form.cpu === (dbConfig?.cpu?.toString() || '') && 
                    form.ram === (dbConfig?.ram ? (Number(dbConfig.ram) / 1073741824).toString() : '') &&
                    form.disk === (dbConfig?.disk ? (Number(dbConfig.disk) / 1073741824).toString() : ''))
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-100 text-gray-900 cursor-pointer'
                  }`}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resizing...
                    </div>
                  ) : (
                    'Apply Changes'
                  )}
                </button>
                {instanceInfo?.status === 'Running' && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-gray-900 text-yellow-300 text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    Instance must be stopped before resizing.
                  </div>
                )}
              </div>
            </div>
          </form>

          <style jsx>{`
            input[type='range'] {
              height: 8px;
              border-radius: 4px;
              outline: none;
            }
            
            input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              background: white;
              border-radius: 50%;
              cursor: pointer;
              transition: all 0.15s ease;
            }
            
            input[type='range']::-webkit-slider-thumb:hover {
              transform: scale(1.2);
            }
            
            input[type='range']::-moz-range-thumb {
              width: 16px;
              height: 16px;
              background: white;
              border: none;
              border-radius: 50%;
              cursor: pointer;
              transition: all 0.15s ease;
            }
            
            input[type='range']::-moz-range-thumb:hover {
              transform: scale(1.2);
            }
          `}</style>
        </div>
      </div>
    </MainLayout>
  );
}
