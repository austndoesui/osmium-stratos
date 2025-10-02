import { useState } from 'react';
import SettingsLayout from '../../../components/settingslayout';

export default function AdminAdvanced() {
  const [apiKey, setApiKey] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [cacheTimeout, setCacheTimeout] = useState(30);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would handle saving the changes to your backend
    console.log('Saving advanced settings:', { apiKey, debugMode, cacheTimeout });
    // Show success notification
    alert('Advanced settings saved successfully!');
  };
  
  return (
    <SettingsLayout>
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
        <h2 className="text-xl font-medium text-white mb-4">Advanced Settings</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* API Key Section */}
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <div className="flex">
                <input
                  type="password"
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                  placeholder="Enter API key"
                />
                <button
                  type="button"
                  className="ml-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Generate
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-400">API key for external integrations.</p>
            </div>
            
            {/* Debug Mode Toggle */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="debug-mode" className="text-sm font-medium text-gray-300">
                  Debug Mode
                </label>
                <button
                  type="button"
                  className={`${
                    debugMode ? 'bg-white' : 'bg-gray-600'
                  } relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-white`}
                  onClick={() => setDebugMode(!debugMode)}
                >
                  <span className="sr-only">Enable debug mode</span>
                  <span
                    className={`${
                      debugMode ? 'translate-x-6 bg-gray-800' : 'translate-x-1 bg-white'
                    } inline-block h-4 w-4 transform rounded-full transition`}
                  />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-400">Enable detailed logging for troubleshooting.</p>
            </div>
            
            {/* Cache Timeout Slider */}
            <div>
              <label htmlFor="cache-timeout" className="block text-sm font-medium text-gray-300 mb-2">
                Cache Timeout (minutes): {cacheTimeout}
              </label>
              <input
                type="range"
                id="cache-timeout"
                min="5"
                max="120"
                step="5"
                value={cacheTimeout}
                onChange={(e) => setCacheTimeout(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5</span>
                <span>60</span>
                <span>120</span>
              </div>
            </div>
            
            {/* Danger Zone */}
            <div className="pt-4 mt-6 border-t border-gray-700">
              <h3 className="text-lg font-medium text-red-400 mb-4">Danger Zone</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 border border-red-800 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-white">Clear All Cache</h4>
                    <p className="text-xs text-gray-400">Remove all cached data from the system.</p>
                  </div>
                  <button
                    type="button"
                    className="bg-gray-700 hover:bg-red-900 text-white font-medium py-2 px-4 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={() => confirm('Are you sure you want to clear all cache?')}
                  >
                    Clear Cache
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-800 border border-red-800 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-white">Reset Configuration</h4>
                    <p className="text-xs text-gray-400">Reset all settings to default values.</p>
                  </div>
                  <button
                    type="button"
                    className="bg-gray-700 hover:bg-red-900 text-white font-medium py-2 px-4 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={() => confirm('Are you sure you want to reset all settings? This cannot be undone.')}
                  >
                    Reset
                  </button>
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
