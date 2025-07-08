import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import InstanceHeader from '../../components/instance_header';
import { useNotification } from '../../providers/NotificationProvider';

export default function Destroy() {
  const { hostId, instanceName } = useParams();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState('');
  const [instanceInfo, setInstanceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const navPlaceholderRef = useRef(null);
  const isMounted = useRef(true);
  const navMoved = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    navMoved.current = false;

    // Fetch instance information
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

    // Move the navigation bar from mainlayout to below the instance name
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

  const handleDestroy = async (e) => {
    e.preventDefault();
    if (confirmText !== instanceName) return;

    setLoading('destroy');
    try {
      const res = await fetch(`/api/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete instance');
      }
      showSuccess(`Instance '${instanceName}' deleted successfully`);
      setTimeout(() => navigate('/instances'), 1200);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading('');
    }
  };

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

      {/* Destroy confirmation form */}
      <div className="max-w-2xl bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-300 mb-6">
          You are about to destroy {instanceName}. 
          This action is permanent and cannot be undone.
        </p>

        <form onSubmit={handleDestroy} className="space-y-6">
          <div>
            <label htmlFor="confirm" className="block text-sm text-gray-300 mb-2">
              Type {instanceName} to confirm
            </label>
            <input
              type="text"
              id="confirm"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type ${instanceName} to confirm`}
            />
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/instance/${hostId}/${instanceName}`)}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={confirmText !== instanceName || loading}
              className={`px-4 py-2 text-sm rounded-md focus:outline-none ${
                confirmText === instanceName && !loading
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Destroying...
                </div>
              ) : (
                'Destroy Instance'
              )}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
