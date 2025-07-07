import MainLayout from '../../components/mainlayout';
import { Link } from 'react-router-dom';

export default function AdminOverview() {
  return (
    <MainLayout>
      <div className="p-4 md:p-6">
        {/* Breadcrumb - matching dashboard.jsx style */}
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
                  <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">Overview</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        
        {/* Page header with heading and subheading */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Admin Overview</h1>
          <p className="text-base text-gray-400">Monitor system status and access essential admin tools</p>
        </div>
        
        {/* Main card with dark theme but layout like the image */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-md mb-6 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="flex items-center">
            <div className="mr-4">
              <img src="/favicon.webp" alt="Osmium Logo" className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Osmium <span className="text-blue-400">[Stratos]</span></h2>
              <p className="text-gray-400 text-sm">Your panel is up-to-date with the latest features and security patches.</p>
            </div>
          </div>
        </div>
        
        {/* Action buttons - updated to be fully colored with uncolored text */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <a href="https://discord.gg/jADngpHumj" target="_blank" rel="noopener noreferrer" className="bg-orange-500/20 hover:bg-orange-500/30 transition-colors rounded-md py-2 px-4 flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span className="text-orange-400 text-sm font-medium">Get help</span>
          </a>
          
          <a href="https://github.com/Carbon-FOSS" target="_blank" rel="noopener noreferrer" className="bg-purple-500/20 hover:bg-purple-500/30 transition-colors rounded-md py-2 px-4 flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z" clipRule="evenodd" />
            </svg>
            <span className="text-purple-400 text-sm font-medium">GitHub</span>
          </a>
          
          <a href="https://docs.qena.pro" target="_blank" rel="noopener noreferrer" className="bg-blue-500/20 hover:bg-blue-500/30 transition-colors rounded-md py-2 px-4 flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            <span className="text-blue-400 text-sm font-medium">Documentation</span>
          </a>
          
          <a href="https://github.com/ajnart/osmium/stargazers" target="_blank" rel="noopener noreferrer" className="bg-green-500/20 hover:bg-green-500/30 transition-colors rounded-md py-2 px-4 flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-green-400 text-sm font-medium">Support the project</span>
          </a>
        </div>
      </div>
    </MainLayout>
  );
}
