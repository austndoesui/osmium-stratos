import { useState, useEffect } from 'react';

export default function ImageGallery() {
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [hostId, setHostId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [addForm, setAddForm] = useState({ label: '', value: '' });
  const [addError, setAddError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = () => {
    fetch('/api/images')
      .then(res => res.json())
      .then(setImages)
      .catch(() => setImages([]));
  };

  useEffect(() => {
    if (showModal) {
      fetch('/api/hosts')
        .then(res => res.json())
        .then(setHosts)
        .catch(() => setHosts([]));
    }
  }, [showModal]);

  const openModal = (image) => {
    setSelectedImage(image);
    setShowModal(true);
    setResult(null);
    setError(null);
    setHostId('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!hostId) return setError('Please select a host');
    setSubmitting(true);
    setResult(null);
    setError(null);
    fetch(`/api/hosts/${hostId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageAlias: selectedImage.value }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to save image');
        setResult('Image saved to LXD!');
      })
      .catch(err => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  const handleAddImage = (e) => {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to add image');
        setAddForm({ label: '', value: '' });
        fetchImages();
      })
      .catch(err => setAddError(err.message))
      .finally(() => setAddSubmitting(false));
  };

  const handleDeleteImage = (id) => {
    if (!window.confirm('Delete this image?')) return;
    fetch(`/api/images/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete image');
        fetchImages();
      })
      .catch(() => {});
  };

  const handleAddFromPublic = (img) => {
    setAddSubmitting(true);
    setAddError(null);
    fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: `${img.distribution} ${img.release} (${img.architecture})`, value: img.value }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Failed to add image');
        fetchImages();
      })
      .catch(err => setAddError(err.message))
      .finally(() => setAddSubmitting(false));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Osmium Images</h1>
      <form onSubmit={handleAddImage} className="max-w-xl mx-auto mb-8 bg-white p-4 rounded shadow flex flex-col md:flex-row gap-2 items-center">
        <input
          className="border p-2 rounded flex-1"
          placeholder="Label (e.g. Ubuntu 22.04)"
          value={addForm.label}
          onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))}
          required
        />
        <input
          className="border p-2 rounded flex-1"
          placeholder="Value (e.g. ubuntu:22.04 or images:debian/12)"
          value={addForm.value}
          onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
          required
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={addSubmitting}>
          {addSubmitting ? 'Adding...' : 'Add Image'}
        </button>
      </form>
      {addError && <div className="text-red-500 text-center mb-4">{addError}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {images.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">No images found. Add a new image above.</div>
        ) : (
          images.map(img => (
            <div key={img.id} className="bg-white rounded shadow p-4 flex flex-col items-center cursor-pointer hover:shadow-lg transition relative">
              <div className="text-xl font-semibold mb-2">{img.label}</div>
              <div className="text-gray-500 text-xs mb-2">{img.value}</div>
              <button className="bg-blue-600 text-white px-3 py-1 rounded mt-2" onClick={() => openModal(img)}>Save to LXD</button>
              <button
                className="absolute top-2 right-2 text-red-500 text-lg"
                title="Delete image"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => handleDeleteImage(img.id)}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowModal(false)}>&times;</button>
            <h2 className="text-2xl font-bold mb-4">Save Image to LXD</h2>
            <form onSubmit={handleSave}>
              <div className="mb-2">
                <label className="block mb-1">Host</label>
                <select value={hostId} onChange={e => setHostId(e.target.value)} required className="w-full p-2 border rounded">
                  <option value="">Select a host</option>
                  {hosts.map(h => <option key={h.id} value={h.id}>{h.name} ({h.address})</option>)}
                </select>
              </div>
              <div className="mb-2">
                <label className="block mb-1">Image</label>
                <input value={selectedImage?.label || ''} disabled className="w-full p-2 border rounded bg-gray-100" />
              </div>
              {error && <div className="text-red-500 mb-2">{error}</div>}
              {result && <div className="text-green-600 mb-2">{result}</div>}
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Image'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
