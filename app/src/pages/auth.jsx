import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

export default function Auth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const [panelName, setPanelName] = useState('Osmium');
  const [logoUrl, setLogoUrl] = useState('/favicon.webp');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  
  // 2FA states
  const [showTwoFactorAuth, setShowTwoFactorAuth] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorUserId, setTwoFactorUserId] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(settings => {
        if (settings.panel_name) setPanelName(settings.panel_name);
        if (settings.logo_url) setLogoUrl(settings.logo_url);
      });
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!username.trim()) newErrors.username = 'Username or email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateTwoFactorCode = () => {
    const newErrors = {};
    if (!twoFactorCode.trim() || twoFactorCode.length !== 6) {
      newErrors.twoFactorCode = 'Valid 6-digit code is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validate()) return;
    
    setLoading(true);
    setSuccess(false);
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setApiError(data.error || 'Invalid username or password');
      } else if (data.twofa_required) {
        // If 2FA is required, show the 2FA input screen
        setShowTwoFactorAuth(true);
        setTwoFactorUserId(data.user_id);
      } else {
        // If 2FA is not required or already verified
        login(data.token);
        setSuccess(true);
      }
    } catch (e) {
      setApiError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validateTwoFactorCode()) return;
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: twoFactorUserId,
          token: twoFactorCode
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setApiError(data.error || 'Invalid verification code');
      } else {
        login(data.token);
        setSuccess(true);
      }
    } catch (e) {
      setApiError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Reset the 2FA state to go back to login form
  const handleBackToLogin = () => {
    setShowTwoFactorAuth(false);
    setTwoFactorCode('');
    setTwoFactorUserId('');
    setApiError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-700 flex flex-col min-h-[500px]">
        <div className="flex items-center justify-center mb-5 pt-4">
          <img src={logoUrl} alt="Panel Logo" className="w-14 h-14 mr-1" />
          <h1 className="text-4xl font-medium text-white">{panelName}</h1>
        </div>
        
        {!showTwoFactorAuth ? (
          <>
            <p className="text-center text-gray-300 font-regular mb-4">Welcome back! Please sign in to continue.</p>
            
            <div className="h-px bg-gray-700 my-5"></div>
            
            {apiError && (
              <div className="bg-red-900/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md mb-5 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{apiError}</span>
              </div>
            )}
            
            {success && (
              <div className="bg-green-900/40 border border-green-500/50 text-green-200 px-4 py-3 rounded-md mb-5 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Login successful! Redirecting...</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-1 flex-grow">
              <div className="mt-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">Username or Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    className={`w-full bg-gray-700 border ${errors.username ? 'border-red-500' : 'border-gray-600'} rounded-md pl-10 pr-4 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent`}
                    type="text"
                    placeholder="Enter your username or email"
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value);
                      if (errors.username) setErrors({...errors, username: ''});
                    }}
                    autoFocus
                  />
                </div>
                {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
              </div>
              
              <div className="mt-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    className={`w-full bg-gray-700 border ${errors.password ? 'border-red-500' : 'border-gray-600'} rounded-md pl-10 pr-4 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent`}
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({...errors, password: ''});
                    }}
                  />
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>
              
              <div className="mt-auto">
                <button
                  className="w-full bg-white hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-md font-medium transition duration-200 mt-4 cursor-pointer"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Logging in...</span>
                    </div>
                  ) : 'Log in'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="text-center text-gray-300 font-regular mb-4">Two-Factor Authentication Required</p>
            
            <div className="h-px bg-gray-700 my-5"></div>
            
            {apiError && (
              <div className="bg-red-900/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md mb-5 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{apiError}</span>
              </div>
            )}
            
            {success && (
              <div className="bg-green-900/40 border border-green-500/50 text-green-200 px-4 py-3 rounded-md mb-5 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Login successful! Redirecting...</span>
              </div>
            )}
            
            <div className="flex justify-center mb-6">
              <div className="bg-gray-700 rounded-full p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="text-center text-gray-300 mb-6">
              Enter the 6-digit code from your authenticator app
            </p>
            
            <form onSubmit={handleTwoFactorSubmit} className="flex flex-col gap-5 px-1 flex-grow">
              <div className="mt-2">
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-400 mb-1">Verification Code</label>
                <input
                  id="twoFactorCode"
                  className={`w-full bg-gray-700 border ${errors.twoFactorCode ? 'border-red-500' : 'border-gray-600'} rounded-md px-4 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-center tracking-widest text-xl`}
                  type="text"
                  placeholder="123456"
                  value={twoFactorCode}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setTwoFactorCode(value);
                    if (errors.twoFactorCode) setErrors({...errors, twoFactorCode: ''});
                  }}
                  maxLength={6}
                  autoFocus
                />
                {errors.twoFactorCode && <p className="text-red-400 text-xs mt-1">{errors.twoFactorCode}</p>}
              </div>
              
              <div className="mt-auto">
                <button
                  className="w-full bg-white hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-md font-medium transition duration-200 mt-4 mb-2 cursor-pointer"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verifying...</span>
                    </div>
                  ) : 'Verify Code'}
                </button>
                
                <button
                  onClick={handleBackToLogin}
                  type="button"
                  className="w-full text-gray-400 hover:text-white py-2 px-4 rounded-md text-sm transition duration-200 cursor-pointer"
                >
                  Back to Login
                </button>
              </div>

              <div className="text-center text-sm text-gray-500 mt-4">
                <p>Lost access to your authenticator app?</p>
                <button 
                  type="button"
                  className="text-white hover:text-gray-300 cursor-pointer"
                  onClick={() => {
                    // This would be implemented later
                    setApiError('Use a recovery code instead');
                  }}
                >
                  Use a recovery code instead
                </button>
              </div>
            </form>
          </>
        )}
        
        <div className="h-px bg-gray-700 my-5"></div>
        
        <div className="text-center text-sm text-gray-400 font-regular pb-2">
          <p>Don't have an account? Contact an admin</p>
        </div>
      </div>
      
      <div className="mt-10 text-center text-sm text-gray-500 font-regular flex items-center">
        <span>Powered by</span>
        <img src={logoUrl} alt="Panel Logo" className="w-5 h-5 mx-2" />
        <span>{panelName}</span>
      </div>
    </div>
  );
}
