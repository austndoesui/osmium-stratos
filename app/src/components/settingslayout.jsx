import { Link, useLocation } from 'react-router-dom';
import MainLayout from './mainlayout';

export default function SettingsLayout({ children }) {
  const location = useLocation();
  
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
                  <Link to="/admin/overview" className="text-sm text-gray-400 hover:text-white ml-1 md:ml-2">
                    Admin
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <Link to="/admin/settings" className="text-sm text-gray-400 hover:text-white ml-1 md:ml-2">
                    Settings
                  </Link>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Panel Settings</h1>
          <p className="text-base text-gray-400">Configure appearance, behavior, and system settings</p>
        </div>

        <div className="mb-6 border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <Link
              to="/admin/settings/config"
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                location.pathname === '/admin/settings/config' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              Configuration
            </Link>
            <Link
              to="/admin/settings/themes"
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                location.pathname === '/admin/settings/themes' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              Themes
            </Link>
            <Link
              to="/admin/settings/advanced"
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                location.pathname === '/admin/settings/advanced' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              Advanced
            </Link>
          </nav>
        </div>
        
        {children}
      </div>
    </MainLayout>
  );
} 