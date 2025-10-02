import { useState, useEffect } from 'react';

export const NotificationTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning'
};

export default function Notification({ message, type = NotificationTypes.INFO, duration = 3000, onClose, style = {} }) {
  const [visible, setVisible] = useState(true);
  const [exit, setExit] = useState(false);

  useEffect(() => {
    if (!message) return;
    
    const timer = setTimeout(() => {
      setExit(true);
      setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!visible || !message) return null;

  const getTypeStyles = () => {
    switch (type) {
      case NotificationTypes.SUCCESS:
        return {
          bg: 'bg-green-900/80',
          border: 'border-green-500',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case NotificationTypes.ERROR:
        return {
          bg: 'bg-red-900/80',
          border: 'border-red-500',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        };
      case NotificationTypes.WARNING:
        return {
          bg: 'bg-yellow-900/80',
          border: 'border-yellow-500',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        };
      default:
        return {
          bg: 'bg-blue-900/80',
          border: 'border-blue-500',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )
        };
    }
  };

  const { bg, border, icon } = getTypeStyles();

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${
        exit ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      }`}
      style={style}
    >
      <div className={`${bg} ${border} border shadow-lg rounded-md px-4 py-3 flex items-center max-w-sm`}>
        <div className="flex-shrink-0 mr-3">
          {icon}
        </div>
        <div className="text-white text-sm">{message}</div>
        <button 
          onClick={() => {
            setExit(true);
            setTimeout(() => {
              setVisible(false);
              if (onClose) onClose();
            }, 300);
          }}
          className="ml-4 text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
} 