import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
import { useNotification } from '../../providers/NotificationProvider';

export default function AdminImage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [hostId, setHostId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ label: '', value: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const modalRef = useRef(null);
  const buttonRef = useRef(null);
  const addModalRef = useRef(null);
  const addButtonRef = useRef(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowModal(false);
      }
      if (addModalRef.current && !addModalRef.current.contains(event.target) && 
          addButtonRef.current && !addButtonRef.current.contains(event.target)) {
        setShowAddModal(false);
      }
    };

    if (showModal || showAddModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal, showAddModal]);

  const fetchImages = () => {
    setLoading(true);
    fetch('/api/images')
      .then(res => res.json())
      .then(data => {
        setImages(data);
      })
      .catch(err => {
        showError('Failed to load images');
        setImages([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (showModal) {
      fetch('/api/hosts')
        .then(res => res.json())
        .then(setHosts)
        .catch(() => {
          showError('Failed to load hosts');
          setHosts([]);
        });
    }
  }, [showModal]);

  const openModal = (image) => {
    setSelectedImage(image);
    setShowModal(true);
    setHostId('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!hostId) {
      showError('Please select a host');
      return;
    }
    setSubmitting(true);
    fetch(`/api/hosts/${hostId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageAlias: selectedImage.value }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to save image');
        showSuccess('Image saved to LXD successfully!');
        setShowModal(false);
      })
      .catch(err => {
        showError(err.message);
      })
      .finally(() => setSubmitting(false));
  };

  const handleAddImage = (e) => {
    e.preventDefault();
    setAddSubmitting(true);
    fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to add image');
        showSuccess('Image added successfully');
        setAddForm({ label: '', value: '' });
        fetchImages();
        setShowAddModal(false);
      })
      .catch(err => {
        showError(err.message);
      })
      .finally(() => setAddSubmitting(false));
  };

  const handleDeleteImage = (id) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    fetch(`/api/images/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete image');
        showSuccess('Image deleted successfully');
        fetchImages();
      })
      .catch(err => {
        showError(err.message);
      });
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
                  <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">Images</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Image Management</h1>
            <p className="text-base text-gray-400">View and manage Osmium images</p>
          </div>
          <div className="relative">
            <button 
              ref={addButtonRef}
              className="bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer"
              onClick={() => setShowAddModal(!showAddModal)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Image
            </button>
            
            {showAddModal && (
              <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                <div 
                  ref={addModalRef}
                  className="bg-gray-800 rounded-lg shadow-xl w-96 border border-gray-700"
                  style={{ animation: 'fadeInDown 0.2s ease-out forwards' }}
                >
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-medium text-white">Add Image</h3>
                    <button 
                      className="text-gray-400 hover:text-white cursor-pointer"
                      onClick={() => setShowAddModal(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <form onSubmit={handleAddImage} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
                        <input 
                          value={addForm.label}
                          onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))}
                          required
                          placeholder="e.g. Ubuntu 22.04"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Value</label>
                        <input 
                          value={addForm.value}
                          onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
                          required
                          placeholder="e.g. ubuntu:22.04 or images:debian/12"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        />
                        <div className="text-xs text-gray-400 mt-1">Use format like ubuntu:22.04 or images:debian/12</div>
                      </div>
                      
                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                          onClick={() => setShowAddModal(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addSubmitting}
                          className={`bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${addSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {addSubmitting ? 'Adding...' : 'Add Image'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">Panel images</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-10 w-10 relative">
                <div className="absolute inset-0 border-2 border-gray-700 rounded-full"></div>
                <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-400 mt-3">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" />
                <path fillRule="evenodd" d="m3.087 9 .54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087ZM12 10.5a.75.75 0 0 1 .75.75v4.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72v-4.94a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-400">No images found</p>
              <button 
                className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Image
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {images.map(img => (
                <div key={img.id} className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden hover:border-gray-500 transition-colors">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-white">{img.label}</h3>
                      <button
                        className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                        onClick={() => handleDeleteImage(img.id)}
                        title="Delete image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-gray-400 text-xs mt-1 font-mono">{img.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && images.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing <span className="font-medium text-white">{images.length}</span> {images.length === 1 ? 'image' : 'images'}
              </div>
            </div>
          )}
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
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
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
