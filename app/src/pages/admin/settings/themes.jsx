import { useState } from 'react';
import SettingsLayout from '../../../components/settingslayout';

export default function AdminThemes() {
  const defaultPrimary = '#111827';
  const defaultAccent = '#ffffff';
  const defaultSidebar = '#1f2937';
  const defaultText = '#e5e7eb';
  
  const [primaryColor, setPrimaryColor] = useState(defaultPrimary);
  const [accentColor, setAccentColor] = useState(defaultAccent);
  const [sidebarColor, setSidebarColor] = useState(defaultSidebar);
  const [textColor, setTextColor] = useState(defaultText);
  const [selectedTheme, setSelectedTheme] = useState('default');
  
  const themes = [
    { id: 'default', name: 'Default', primary: defaultPrimary, accent: defaultAccent, sidebar: defaultSidebar, text: defaultText },
    { id: 'light', name: 'Light Mode', primary: '#f8f9fa', accent: '#3b82f6', sidebar: '#ffffff', text: '#1f2937' },
    { id: 'midnight', name: 'Midnight', primary: '#0f172a', accent: '#60a5fa', sidebar: '#020617', text: '#f1f5f9' },
    { id: 'custom', name: 'Custom', primary: primaryColor, accent: accentColor, sidebar: sidebarColor, text: textColor }
  ];
  
  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    
    if (themeId !== 'custom') {
      const theme = themes.find(t => t.id === themeId);
      setPrimaryColor(theme.primary);
      setAccentColor(theme.accent);
      setSidebarColor(theme.sidebar);
      setTextColor(theme.text);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would handle saving the changes to your backend
    console.log('Saving theme:', { primaryColor, accentColor, sidebarColor, textColor });
    // Show success notification
    alert('Theme settings saved successfully!');
  };
  
  return (
    <SettingsLayout>
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
        <h2 className="text-xl font-medium text-white mb-4">Theme Settings</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Theme Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Theme Presets
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {themes.map((theme) => (
                  <div 
                    key={theme.id}
                    className={`cursor-pointer rounded-md overflow-hidden border-2 ${
                      selectedTheme === theme.id ? 'border-white' : 'border-transparent'
                    }`}
                    onClick={() => handleThemeSelect(theme.id)}
                  >
                    <div className="h-16 flex flex-col">
                      <div className="h-3" style={{ backgroundColor: theme.accent }}></div>
                      <div className="flex flex-1">
                        <div className="w-1/4" style={{ backgroundColor: theme.sidebar }}></div>
                        <div className="w-3/4" style={{ backgroundColor: theme.primary }}></div>
                      </div>
                    </div>
                    <div className="py-1 px-2 text-center text-xs font-medium text-gray-300 bg-gray-700">
                      {theme.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Custom Colors */}
            <div className={`${selectedTheme === 'custom' ? 'opacity-100' : 'opacity-60'}`}>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Custom Colors
                </label>
                {selectedTheme !== 'custom' && (
                  <span className="text-xs text-gray-400">Select Custom theme to edit colors</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="primary-color" className="block text-sm font-medium text-gray-300 mb-2">
                    Primary Background
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      id="primary-color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-9 rounded-md border border-gray-600 bg-transparent cursor-pointer"
                      disabled={selectedTheme !== 'custom'}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="ml-2 flex-1 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      disabled={selectedTheme !== 'custom'}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="accent-color" className="block text-sm font-medium text-gray-300 mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      id="accent-color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-9 w-9 rounded-md border border-gray-600 bg-transparent cursor-pointer"
                      disabled={selectedTheme !== 'custom'}
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="ml-2 flex-1 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      disabled={selectedTheme !== 'custom'}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="sidebar-color" className="block text-sm font-medium text-gray-300 mb-2">
                    Sidebar Background
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      id="sidebar-color"
                      value={sidebarColor}
                      onChange={(e) => setSidebarColor(e.target.value)}
                      className="h-9 w-9 rounded-md border border-gray-600 bg-transparent cursor-pointer"
                      disabled={selectedTheme !== 'custom'}
                    />
                    <input
                      type="text"
                      value={sidebarColor}
                      onChange={(e) => setSidebarColor(e.target.value)}
                      className="ml-2 flex-1 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      disabled={selectedTheme !== 'custom'}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="text-color" className="block text-sm font-medium text-gray-300 mb-2">
                    Text Color
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      id="text-color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-9 w-9 rounded-md border border-gray-600 bg-transparent cursor-pointer"
                      disabled={selectedTheme !== 'custom'}
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="ml-2 flex-1 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      disabled={selectedTheme !== 'custom'}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preview
              </label>
              <div className="border border-gray-600 rounded-md overflow-hidden">
                <div className="h-3" style={{ backgroundColor: accentColor }}></div>
                <div className="flex h-64">
                  <div className="w-1/4" style={{ backgroundColor: sidebarColor }}>
                    <div className="p-3">
                      <div className="h-4 w-16 mb-4 rounded bg-gray-600"></div>
                      <div className="h-3 w-20 mb-2 rounded bg-gray-600"></div>
                      <div className="h-3 w-16 mb-2 rounded bg-gray-600"></div>
                      <div className="h-3 w-18 rounded bg-gray-600"></div>
                    </div>
                  </div>
                  <div className="w-3/4" style={{ backgroundColor: primaryColor }}>
                    <div className="p-4">
                      {/* Breadcrumb */}
                      <div className="flex mb-3">
                        <div className="h-2 w-8 rounded" style={{ backgroundColor: textColor, opacity: 0.5 }}></div>
                        <div className="h-2 w-2 mx-1 rounded-full" style={{ backgroundColor: textColor, opacity: 0.3 }}></div>
                        <div className="h-2 w-16 rounded" style={{ backgroundColor: textColor, opacity: 0.7 }}></div>
                      </div>
                      
                      {/* Welcome heading */}
                      <div className="h-4 w-40 mb-1 rounded" style={{ backgroundColor: textColor, opacity: 0.9 }}></div>
                      <div className="h-3 w-56 mb-4 rounded" style={{ backgroundColor: textColor, opacity: 0.5 }}></div>
                      
                      {/* Stats cards */}
                      <div className="flex space-x-2 mb-4">
                        <div className="flex-1 h-14 rounded" style={{ backgroundColor: textColor, opacity: 0.1 }}></div>
                        <div className="flex-1 h-14 rounded" style={{ backgroundColor: textColor, opacity: 0.1 }}></div>
                        <div className="flex-1 h-14 rounded" style={{ backgroundColor: textColor, opacity: 0.1 }}></div>
                      </div>
                      
                      {/* Getting Started heading */}
                      <div className="h-4 w-32 mb-3 rounded" style={{ backgroundColor: textColor, opacity: 0.9 }}></div>
                      
                      {/* Guide cards - 2x2 grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-20 rounded" style={{ backgroundColor: textColor, opacity: 0.1 }}></div>
                        <div className="h-20 rounded" style={{ backgroundColor: textColor, opacity: 0.1 }}></div>
                        <div className="h-20 rounded" style={{ backgroundColor: textColor, opacity: 0.1 }}></div>
                        <div className="h-20 rounded" style={{ backgroundColor: textColor, opacity: 0.1 }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}
