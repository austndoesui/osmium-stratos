import { useState, useContext, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  useEffect(() => {
    if (location.pathname === '/auth') return;
    
    setPageLoading(true);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    loadingTimeoutRef.current = setTimeout(() => {
      setPageLoading(false);
    }, 500);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [location.pathname]);

  const generateAvatarUrl = (username) => {
    const seed = username || 'anonymous';
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  };

  const notifications = [
    { 
      id: 1, 
      title: 'Instance Started', 
      message: 'Your instance "web-server-01" has started successfully', 
      time: '5 min ago',
      read: false
    },
    { 
      id: 2, 
      title: 'Storage Alert', 
      message: 'Instance "db-server-01" is running low on disk space (85%)', 
      time: '1 hour ago',
      read: false
    },
    { 
      id: 3, 
      title: 'Maintenance Scheduled', 
      message: 'System maintenance scheduled for tomorrow at 02:00 UTC', 
      time: '3 hours ago',
      read: true
    }
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationRef]);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const menuCategories = [
    {
      name: "General",
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          )
        },
        {
          name: 'Instances',
          path: '/instances',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.507 4.048A3 3 0 0 1 7.785 3h8.43a3 3 0 0 1 2.278 1.048l1.722 2.008A4.533 4.533 0 0 0 19.5 6h-15c-.243 0-.482.02-.715.056l1.722-2.008Z" />
              <path fillRule="evenodd" d="M1.5 10.5a3 3 0 0 1 3-3h15a3 3 0 1 1 0 6h-15a3 3 0 0 1-3-3Zm15 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm2.25.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4.5 15a3 3 0 1 0 0 6h15a3 3 0 1 0 0-6h-15Zm11.25 3.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM19.5 18a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd" />
            </svg>
          )
        },
        {
          name: 'Account',
          path: '/account',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )
        }
      ]
    }
  ];

  if (user && user.role === 'admin') {
    menuCategories.push({
      name: "Admin",
      items: [
        {
          name: 'Overview',
          path: '/admin/overview',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
          )
        },
        {
          name: 'Users',
          path: '/admin/users',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          )
        },
        {
          name: 'Instances',
          path: '/admin/instances',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.507 4.048A3 3 0 0 1 7.785 3h8.43a3 3 0 0 1 2.278 1.048l1.722 2.008A4.533 4.533 0 0 0 19.5 6h-15c-.243 0-.482.02-.715.056l1.722-2.008Z" />
              <path fillRule="evenodd" d="M1.5 10.5a3 3 0 0 1 3-3h15a3 3 0 1 1 0 6h-15a3 3 0 0 1-3-3Zm15 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm2.25.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4.5 15a3 3 0 1 0 0 6h15a3 3 0 1 0 0-6h-15Zm11.25 3.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM19.5 18a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd" />
            </svg>
          )
        },
        {
          name: 'Hosts',
          path: '/admin/node',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" />
              <path d="m3.265 10.602 7.668 4.129a2.25 2.25 0 0 0 2.134 0l7.668-4.13 1.37.739a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.71 0l-9.75-5.25a.75.75 0 0 1 0-1.32l1.37-.738Z" />
              <path d="m10.933 19.231-7.668-4.13-1.37.739a.75.75 0 0 0 0 1.32l9.75 5.25c.221.12.489.12.71 0l9.75-5.25a.75.75 0 0 0 0-1.32l-1.37-.738-7.668 4.13a2.25 2.25 0 0 1-2.134-.001Z" />
            </svg>
          )
        },
        {
          name: 'Images',
          path: '/admin/image',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" />
              <path fillRule="evenodd" d="m3.087 9 .54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087ZM12 10.5a.75.75 0 0 1 .75.75v4.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72v-4.94a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
            </svg>
          )
        }
      ]
    });
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-900">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:z-auto flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
          <div className="flex items-center">
            <img src="/favicon.webp" alt="Osmium Logo" className="w-8 h-8" />
            <h1 className="ml-2 text-xl font-medium text-white">Osmium</h1>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white" 
            onClick={() => setSidebarOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="py-4 flex-1 overflow-y-auto">
          {menuCategories.map((category, index) => (
            <div key={index} className="mb-6">
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {category.name}
              </h3>
              <nav className="px-2 space-y-1">
                {category.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.path)
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  src={generateAvatarUrl(user?.username)} 
                  alt="User Avatar" 
                  className="h-10 w-10 rounded-md bg-gray-700"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white truncate">
                  {user?.username || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </p>
              </div>
              <div className="ml-auto">
                <button 
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
                  onClick={logout}
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M16.5 3.75a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V15a.75.75 0 0 0-1.5 0v3.75a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3V9A.75.75 0 1 0 9 9V5.25a1.5 1.5 0 0 1 1.5-1.5h6Zm-5.03 4.72a.75.75 0 0 0 0 1.06l1.72 1.72H2.25a.75.75 0 0 0 0 1.5h10.94l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 0 0-1.06 0Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center flex-1">
                <button
                  className="md:hidden text-gray-400 hover:text-white focus:outline-none"
                  onClick={() => setSidebarOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div className="ml-4 flex-1 max-w-xs">
                  <form onSubmit={handleSearch} className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search instances, images..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-gray-600 sm:text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="ml-3 relative" ref={notificationRef}>
                  <button
                    className="bg-gray-700 text-white p-2 rounded-md text-sm font-medium flex items-center hover:bg-gray-600 transition-colors relative"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-xs font-bold text-white">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-gray-800 border border-gray-700 focus:outline-none z-50">
                      <div className="py-2">
                        <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                          <h3 className="text-sm font-medium text-white">Notifications</h3>
                          <button className="text-xs text-blue-400 hover:text-blue-300">
                            Mark all as read
                          </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-gray-400 text-sm">
                              No notifications
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div 
                                key={notification.id} 
                                className={`px-4 py-3 hover:bg-gray-700 ${!notification.read ? 'bg-gray-750' : ''}`}
                              >
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium text-white">{notification.title}</p>
                                  <span className="text-xs text-gray-400">{notification.time}</span>
                                </div>
                                <p className="text-xs text-gray-300 mt-1">{notification.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="px-4 py-2 border-t border-gray-700">
                          <a href="#" className="text-xs text-blue-400 hover:text-blue-300 block text-center">
                            View all notifications
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-900 relative">
          {pageLoading && location.pathname !== '/auth' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-10">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 relative">
                  <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                  <div className="absolute inset-0 border-t-4 border-white rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-sm text-gray-300">Loading...</p>
              </div>
            </div>
          )}
          <div className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex-grow">
          {children}
            </div>
            
            <div className="mt-10 text-center space-y-2">
              <div className="text-sm text-gray-500 font-regular flex items-center justify-center">
                <span>Powered by</span>
                <img src="/favicon.webp" alt="Osmium Logo" className="w-5 h-5 mx-2" />
                <span>Osmium</span>
              </div>
              <div className="text-xs text-gray-600">
                © {new Date().getFullYear()} Carbon Labs. All rights reserved.
              </div>
            </div>
          </div>
          
          {location.pathname.includes('/instance/') && (
            <div 
              id="instance-nav" 
              className="mb-6 border-b border-gray-700" 
              style={{display: 'none', position: 'absolute', width: 'calc(100% - 2rem)'}}
            >
              <nav className="-mb-px flex space-x-6">
                <Link
                  to={location.pathname.replace(/\/console$|\/resize$|\/backups$|\/history$|\/destroy$|\/metrics$|\/network$/, '')}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                    !location.pathname.match(/\/console$|\/resize$|\/backups$|\/history$|\/destroy$|\/metrics$|\/network$/) 
                      ? 'border-white text-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  to={`${location.pathname.replace(/\/console$|\/resize$|\/backups$|\/history$|\/destroy$|\/metrics$|\/overview$|\/network$/, '')}/metrics`}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                    location.pathname.endsWith('/metrics') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Metrics
                </Link>
                <Link
                  to={`${location.pathname.replace(/\/console$|\/resize$|\/backups$|\/history$|\/destroy$|\/metrics$|\/overview$|\/network$/, '')}/console`}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                    location.pathname.endsWith('/console') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Console
                </Link>
                {user && user.role === 'admin' && (
                <Link
                  to={`${location.pathname.replace(/\/console$|\/resize$|\/backups$|\/history$|\/destroy$|\/metrics$|\/overview$|\/network$/, '')}/resize`}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                    location.pathname.endsWith('/resize') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Resize
                </Link>
                )}
                <Link
                  to={`${location.pathname.replace(/\/console$|\/resize$|\/backups$|\/history$|\/destroy$|\/metrics$|\/overview$|\/network$/, '')}/network`}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                    location.pathname.endsWith('/network') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Network
                </Link>
                <Link
                  to={`${location.pathname.replace(/\/console$|\/resize$|\/backups$|\/history$|\/destroy$|\/metrics$|\/overview$|\/network$/, '')}/history`}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                    location.pathname.endsWith('/history') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  History
                </Link>
                <Link
                  to={`${location.pathname.replace(/\/console$|\/resize$|\/backups$|\/history$|\/destroy$|\/metrics$|\/overview$|\/network$/, '')}/destroy`}
                  className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
                    location.pathname.endsWith('/destroy') 
                      ? 'border-white text-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Destroy
                </Link>
              </nav>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}