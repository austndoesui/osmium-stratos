import { useMemo } from 'react';

const UserAvatar = ({ 
  user, 
  size = 'md', 
  showName = false, 
  className = '',
  onClick = null,
  useImage = true // New prop to control whether to use image or initials
}) => {
  // Size variants
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  // Generate initials from user data (fallback)
  const initials = useMemo(() => {
    if (!user) return '?';
    
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    
    if (user.email) {
      const emailParts = user.email.split('@')[0];
      return emailParts.substring(0, 2).toUpperCase();
    }
    
    return '?';
  }, [user]);

  // Generate consistent color based on user ID or username (for fallback)
  const avatarColor = useMemo(() => {
    if (!user) return 'bg-gray-600';
    
    const colors = [
      'bg-blue-600',
      'bg-green-600', 
      'bg-purple-600',
      'bg-pink-600',
      'bg-indigo-600',
      'bg-red-600',
      'bg-yellow-600',
      'bg-teal-600',
      'bg-orange-600',
      'bg-cyan-600'
    ];
    
    const identifier = user.id || user.username || user.email || '';
    const hash = identifier.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }, [user]);

  const baseClasses = `
    inline-flex items-center justify-center
    rounded-full font-medium text-white overflow-hidden
    ${sizeClasses[size]}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `;

  // If using image mode, show the PNG avatar
  if (useImage) {
    const AvatarElement = (
      <div 
        className={baseClasses}
        onClick={onClick}
        title={user?.username || user?.email || 'User'}
      >
        <img 
          src="/user-avatar.png" 
          alt={user?.username || 'User Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Try SVG fallback first
            if (e.target.src.endsWith('.png')) {
              e.target.src = '/user-avatar.svg';
              return;
            }
            // If SVG also fails, show initials
            e.target.style.display = 'none';
            const parent = e.target.parentElement;
            parent.innerHTML = initials;
            parent.className = parent.className.replace('overflow-hidden', '') + ` ${avatarColor}`;
          }}
        />
      </div>
    );

    if (showName) {
      return (
        <div className="flex items-center space-x-3">
          {AvatarElement}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">
              {user?.username || 'Unknown User'}
            </span>
            {user?.email && user?.username !== user?.email && (
              <span className="text-xs text-gray-400">
                {user.email}
              </span>
            )}
          </div>
        </div>
      );
    }

    return AvatarElement;
  }

  // Fallback to initials mode
  const fallbackClasses = `${baseClasses} ${avatarColor}`;
  
  const AvatarElement = (
    <div 
      className={fallbackClasses}
      onClick={onClick}
      title={user?.username || user?.email || 'User'}
    >
      {initials}
    </div>
  );

  if (showName) {
    return (
      <div className="flex items-center space-x-3">
        {AvatarElement}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">
            {user?.username || 'Unknown User'}
          </span>
          {user?.email && user?.username !== user?.email && (
            <span className="text-xs text-gray-400">
              {user.email}
            </span>
          )}
        </div>
      </div>
    );
  }

  return AvatarElement;
};

// Avatar group component for showing multiple users
export const AvatarGroup = ({ users = [], max = 3, size = 'md' }) => {
  const displayUsers = users.slice(0, max);
  const remainingCount = Math.max(0, users.length - max);

  return (
    <div className="flex -space-x-2">
      {displayUsers.map((user, index) => (
        <UserAvatar
          key={user.id || index}
          user={user}
          size={size}
          className="border-2 border-gray-800"
        />
      ))}
      {remainingCount > 0 && (
        <div className={`
          inline-flex items-center justify-center
          rounded-full bg-gray-600 text-white font-medium
          border-2 border-gray-800
          ${size === 'xs' ? 'w-6 h-6 text-xs' : ''}
          ${size === 'sm' ? 'w-8 h-8 text-sm' : ''}
          ${size === 'md' ? 'w-10 h-10 text-base' : ''}
          ${size === 'lg' ? 'w-12 h-12 text-lg' : ''}
          ${size === 'xl' ? 'w-16 h-16 text-xl' : ''}
        `}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

// Avatar with status indicator
export const StatusAvatar = ({ user, status = 'offline', size = 'md', ...props }) => {
  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-500'
  };

  const statusSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5', 
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4'
  };

  return (
    <div className="relative inline-block">
      <UserAvatar user={user} size={size} {...props} />
      <span className={`
        absolute bottom-0 right-0 block rounded-full ring-2 ring-gray-800
        ${statusSizes[size]}
        ${statusColors[status]}
      `} />
    </div>
  );
};

export default UserAvatar;