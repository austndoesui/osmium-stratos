# Osmium Stratos

A modern web-based LXD management platform built with Node.js and React. Osmium Stratos provides an intuitive interface for managing LXD containers and virtual machines with advanced features like real-time monitoring, instance management, and user authentication.

## 🎨 User Interface

### Modern Avatar System

Osmium Stratos features a modern, customizable avatar system:

- **Custom PNG Support**: Upload your own avatar image
- **Smart Fallbacks**: Automatic fallback to colored initials if image fails
- **Consistent Sizing**: Multiple size variants (xs, sm, md, lg, xl, 2xl)
- **Status Indicators**: Online/offline status support
- **Group Avatars**: Display multiple users with overflow indicators

#### Setting Up Custom Avatars

1. **Add your avatar image** to `app/public/user-avatar.png`
2. The system automatically uses your image for all users
3. Fallback to colored initials if image is unavailable

```jsx
// Default avatar with custom PNG
<UserAvatar user={user} size="md" />

// Force initials mode
<UserAvatar user={user} size="md" useImage={false} />

// Avatar with status
<StatusAvatar user={user} status="online" />
```

## 🚀 Features

- **Instance Management**: Create, start, stop, and delete LXD containers and VMs
- **Real-time Monitoring**: Live metrics and resource usage monitoring
- **User Authentication**: Secure JWT-based authentication with 2FA support
- **Host Management**: Multi-host LXD cluster support
- **Image Management**: Browse and manage LXD images
- **Network Configuration**: Advanced networking features
- **Snapshot Management**: Create and restore snapshots
- **Admin Panel**: Comprehensive administration interface
- **Modern UI**: Responsive React-based interface with dark theme

## 📋 Prerequisites

Before setting up Osmium Stratos, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **PostgreSQL** (v13 or higher)
- **LXD** (v5.0 or higher) - on the target hosts
- **Git**

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/craterXO/osmium-stratos.git
cd osmium-stratos
```

### 2. Backend Setup

#### Install Dependencies

```bash
npm install
```

#### Database Setup

1. **Create PostgreSQL Database**:
```sql
CREATE DATABASE osmium_stratos;
CREATE USER osmium_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE osmium_stratos TO osmium_user;
```

2. **Configure Environment Variables**:
Create a `.env` file in the root directory:
```env
# Database Configuration
DATABASE_URL="postgresql://osmium_user:your_secure_password@localhost:5432/osmium_stratos"

# JWT Configuration
JWT_SECRET="your_very_secure_jwt_secret_key_here"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=3000
NODE_ENV=development

# LXD Configuration
LXD_DEFAULT_TIMEOUT=30000

# 2FA Configuration (Optional)
ENABLE_2FA=true

# Logging
LOG_LEVEL=info
```

3. **Run Database Migrations**:
```bash
npx prisma generate
npx prisma migrate deploy
```

4. **Seed Initial Data** (Optional):
```bash
npm run seed
```

#### Start Backend Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:3000`

### 3. Frontend Setup

#### Navigate to Frontend Directory

```bash
cd app
```

#### Install Frontend Dependencies

```bash
npm install
```

#### Configure Frontend Environment

Create a `.env` file in the `app` directory:
```env
# API Configuration
VITE_API_URL=http://localhost:3000

# App Configuration
VITE_APP_NAME="Osmium Stratos"
VITE_APP_VERSION="1.0.0"
```

#### Start Frontend Development Server

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
osmium-stratos/
├── README.md                 # This file
├── package.json             # Backend dependencies
├── .env                     # Backend environment variables
├── index.js                 # Main server entry point
├── migrate-data.js          # Data migration utility
├── handlers/                # Backend request handlers
│   ├── api.js              # Main API router
│   ├── cache.js            # Caching system
│   ├── jobQueue.js         # Background job processing
│   ├── middleware.js       # Custom middleware
│   └── ...
├── modules/                 # Business logic modules
│   ├── auth.js             # Authentication
│   ├── hosts.js            # Host management
│   ├── instance.js         # Instance operations
│   └── ...
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migration files
├── public/                  # Static backend assets
└── app/                     # Frontend React application
    ├── package.json        # Frontend dependencies
    ├── vite.config.js      # Vite configuration
    ├── src/                # React source code
    │   ├── App.jsx         # Main App component
    │   ├── components/     # Reusable components
    │   ├── pages/          # Page components
    │   ├── hooks/          # Custom React hooks
    │   └── providers/      # Context providers
    └── public/             # Static frontend assets
```

## 🔐 LXD Configuration

### 1. Install LXD (on target hosts)

```bash
# Ubuntu/Debian
sudo snap install lxd

# Initialize LXD
sudo lxd init
```

### 2. Configure LXD for Remote Access

```bash
# Generate client certificate
lxc config set core.https_address "0.0.0.0:8443"
lxc config set core.trust_password "your_secure_password"

# Add trust certificate (run this from Osmium Stratos server)
lxc remote add myhost https://target-host-ip:8443
```

### 3. Add Hosts in Osmium Stratos

1. Login to the admin panel
2. Navigate to "Admin" → "Node Management"
3. Click "Add Host"
4. Enter host details:
   - **Name**: Friendly name for the host
   - **Address**: `https://host-ip:8443`
   - **Certificate**: LXD client certificate
   - **Key**: LXD client key

## 🎯 Usage

### First Time Setup

1. **Access the Application**: Open `http://localhost:5173` in your browser
2. **Create Admin Account**: Use the registration form to create the first admin user
3. **Add LXD Hosts**: Go to Admin → Node Management and add your LXD hosts
4. **Configure Images**: Go to Admin → Image Management to set up available images

### Daily Operations

- **Dashboard**: Overview of all instances and system status
- **Instances**: Create, manage, and monitor containers/VMs
- **Admin Panel**: User management, host configuration, system settings

## 🚀 Performance Features

### Backend Optimizations

- **Async/Await Architecture**: Non-blocking operations throughout
- **Response Caching**: TTL-based in-memory caching with 80-90% hit rates
- **Parallel Processing**: Concurrent operations using Promise.all()
- **Background Job Queues**: Non-blocking heavy operations
- **Database Optimization**: Efficient Prisma queries with connection pooling

### Frontend Optimizations

- **React Query**: Automatic caching and background data synchronization
- **Code Splitting**: Lazy-loaded components for faster initial load
- **Bundle Optimization**: Manual chunk splitting for better caching
- **PWA Support**: Service worker for offline functionality
- **Error Boundaries**: Graceful error handling and recovery

## 🧪 Development

### Running Tests

```bash
# Backend tests
npm test

# Frontend tests
cd app && npm test
```

### Linting and Code Quality

```bash
# Backend linting
npm run lint

# Frontend linting
cd app && npm run lint

# Fix linting issues
npm run lint:fix
cd app && npm run lint:fix
```

### Database Operations

```bash
# Generate Prisma client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

### Production Build

```bash
# Build frontend
cd app && npm run build

# Analyze bundle size
cd app && npm run analyze

# Start production backend
npm start
```

## 🔧 Configuration

### Backend Configuration

Key configuration options in `.env`:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `ENABLE_2FA`: Enable two-factor authentication

### Frontend Configuration

Key configuration options in `app/.env`:

- `VITE_API_URL`: Backend API URL
- `VITE_APP_NAME`: Application name shown in UI
- `VITE_APP_VERSION`: Application version

### Vite Configuration

The `app/vite.config.js` includes optimizations for:

- **Code Splitting**: Vendor chunks for better caching
- **Compression**: Gzip compression for smaller files
- **PWA**: Service worker configuration
- **Bundle Analysis**: Tools for analyzing bundle size

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env
   - Ensure database user has proper permissions

2. **LXD Connection Issues**:
   - Verify LXD is running on target host
   - Check firewall settings (port 8443)
   - Validate certificates and trust relationships

3. **Frontend Build Errors**:
   - Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
   - Check for TypeScript errors: `npm run type-check`

4. **Performance Issues**:
   - Check cache hit rates in logs
   - Monitor database query performance
   - Use browser dev tools to analyze frontend performance

### Logs

- **Backend Logs**: Check console output or log files
- **Frontend Logs**: Check browser console for errors
- **Database Logs**: Check PostgreSQL logs for query issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the [Wiki](https://github.com/craterXO/osmium-stratos/wiki) for detailed guides

## 🔄 Updates

To update Osmium Stratos:

```bash
# Pull latest changes
git pull origin main

# Update backend dependencies
npm install

# Update frontend dependencies
cd app && npm install

# Run any new migrations
npx prisma migrate deploy

# Rebuild frontend
cd app && npm run build
```

---

**Osmium Stratos** - Modern LXD Management Made Simple