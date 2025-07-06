import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification, { NotificationTypes } from '../components/Notification';

// Create the notification context
const NotificationContext = createContext();

// Generate unique IDs for notifications
let notificationId = 0;
const generateId = () => {
  return `notification-${notificationId++}`;
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // Add a new notification
  const addNotification = useCallback((message, type = NotificationTypes.INFO, duration = 3000) => {
    const id = generateId();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  // Remove a notification by ID
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Helper methods for different notification types
  const showSuccess = useCallback((message, duration = 3000) => {
    return addNotification(message, NotificationTypes.SUCCESS, duration);
  }, [addNotification]);

  const showError = useCallback((message, duration = 3000) => {
    return addNotification(message, NotificationTypes.ERROR, duration);
  }, [addNotification]);

  const showInfo = useCallback((message, duration = 3000) => {
    return addNotification(message, NotificationTypes.INFO, duration);
  }, [addNotification]);

  const showWarning = useCallback((message, duration = 3000) => {
    return addNotification(message, NotificationTypes.WARNING, duration);
  }, [addNotification]);

  // Provide the context value
  const contextValue = {
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Render all active notifications */}
      <div className="notification-container">
        {notifications.map((notification, index) => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
            style={{ bottom: `${(index * 4) + 1}rem` }} // Stack notifications with 1rem gap
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

// Custom hook to use the notification context
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 