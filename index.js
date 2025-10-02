const express = require("express");
const path = require("path");
const config = require("./handlers/config");
const { initializeDatabase } = require("./handlers/prisma");
const router = require("./handlers/router");
const http = require("http");
const websocket = require("./modules/websocket");
const moduleHandler = require("./handlers/module_handler");
const fs = require("fs");
const chalk = require("chalk");
const securityAndLoggingMiddleware = require("./handlers/middleware");

// Import security modules
const {
  rateLimits,
  helmetConfig,
  corsConfig,
  sanitizeInput,
  sqlInjectionProtection,
  bruteForceProtection,
  hpp
} = require("./handlers/security");

const app = express();
const PORT = process.env.PORT || config.server.port || 3000;

// Trust proxy headers for accurate IP detection (secure configuration)
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

// ========== SECURITY MIDDLEWARE ==========
// Apply security headers and CORS
app.use(helmetConfig);
app.use(corsConfig);

// HTTP Parameter Pollution protection
app.use(hpp);

// General rate limiting for all routes
app.use(rateLimits.general);

// Body parsing with size limits
app.use(express.json({ 
  limit: "1mb", // Reduced from 10mb for security
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: "1mb" // Reduced from 10mb for security
}));

// Input sanitization and SQL injection protection
app.use(sanitizeInput);
app.use(sqlInjectionProtection);

// Brute force protection for sensitive endpoints
app.use(['/api/login', '/api/register', '/api/2fa'], bruteForceProtection);

// Custom logging and additional security headers
app.use(securityAndLoggingMiddleware);

// ========== ROUTES ==========
// Apply specific rate limiting for sensitive endpoints
app.use('/api/login', rateLimits.auth);
app.use('/api/register', rateLimits.auth);
app.use('/api/2fa', rateLimits.auth);
app.use('/api/account/password', rateLimits.passwordReset);
app.use('/api/users', rateLimits.userActions);

// Main API router
app.use("/api", router);

// Security: Prevent directory traversal and serve only built frontend
app.use(express.static(path.join(__dirname, "public"), {
  dotfiles: 'deny',
  index: false,
  redirect: false
}));

// Catch-all route for SPA (must be last)
app.get("*", (req, res) => {
  // Security: Prevent path traversal
  const safePath = path.join(__dirname, "public", "index.html");
  if (!safePath.startsWith(path.join(__dirname, "public"))) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.sendFile(safePath);
});

// ========== ERROR HANDLING ==========
// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.warn(`🚨 404 API endpoint not found: ${req.method} ${req.path} from ${req.ip}`);
  res.status(404).json({ 
    error: 'API endpoint not found',
    method: req.method,
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error details
  console.error(`🚨 Server error from ${req.ip}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON format' });
  }

  // Default error response (don't expose internal errors in production)
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// ========== SERVER ==========
const server = http.createServer(app);
websocket.setupWebSocketServer(server);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log it
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('🚨 Server shutting down due to uncaught exception');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Initialize database connection before starting server
async function startServer() {
  try {
    await initializeDatabase();
    
    server.listen(PORT, () => {
      // Clear console for clean startup
      console.clear();

      // Modern ASCII art logo
      console.log(
        chalk.cyan.bold(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   ██████  ███████ ███    ███ ██ ██    ██ ███    ███      ║
    ║  ██    ██ ██      ████  ████ ██ ██    ██ ████  ████      ║
    ║  ██    ██ ███████ ██ ████ ██ ██ ██    ██ ██ ████ ██      ║
    ║  ██    ██      ██ ██  ██  ██ ██ ██    ██ ██  ██  ██      ║
    ║   ██████  ███████ ██      ██ ██  ██████  ██      ██      ║
    ║                                                           ║
    ║                 Osmium ( stratos ) 0.3x                        ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
  `),
  );

  // Version and status info
  console.log(
    chalk.gray(
      "    ┌─────────────────────────────────────────────────────────┐",
    ),
  );
  console.log(
    chalk.gray("    │") +
      chalk.white.bold("  Version: ") +
      chalk.cyan("0.3x") +
      chalk.gray("                                           │"),
  );
  console.log(
    chalk.gray("    │") +
      chalk.white.bold("  Mode: ") +
      chalk.yellow(config.mode || "development") +
      chalk.gray("                                       │"),
  );
  console.log(
    chalk.gray("    │") +
      chalk.white.bold("  Port: ") +
      chalk.green(PORT) +
      chalk.gray("                                               │"),
  );
  console.log(
    chalk.gray(
      "    └─────────────────────────────────────────────────────────┘",
    ),
  );
  console.log("");

  if (config.mode !== "production") {
    const modules = Object.keys(moduleHandler);

    // Modern loading animation
    console.log(chalk.white.bold("    🚀 Initializing System Modules..."));
    console.log("");

    let moduleIndex = 0;
    let dots = 0;

    const loadingInterval = setInterval(() => {
      if (moduleIndex < modules.length) {
        const module = modules[moduleIndex];
        const status = "✅";
        const icon = getModuleIcon(module);

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(
          chalk.green(
            `    ${status} ${icon} ${module.charAt(0).toUpperCase() + module.slice(1).replace("_", " ")} module loaded`,
          ),
        );

        setTimeout(() => {
          console.log("");
          moduleIndex++;
        }, 100);
      } else {
        clearInterval(loadingInterval);

        // Final status
        console.log("");
        console.log(
          chalk.gray(
            "    ┌─────────────────────────────────────────────────────────┐",
          ),
        );
        console.log(
          chalk.gray("    │") +
            chalk.green.bold("  ✅ All modules loaded successfully") +
            chalk.gray("                    │"),
        );
        console.log(
          chalk.gray("    │") +
            chalk.blue.bold(`  🌐 Server running at http://localhost:${PORT}`) +
            chalk.gray("             │"),
        );
        console.log(
          chalk.gray("    │") +
            chalk.yellow.bold("  📊 Ready to accept connections") +
            chalk.gray("                        │"),
        );
        console.log(
          chalk.gray(
            "    └─────────────────────────────────────────────────────────┘",
          ),
        );
        console.log("");
        console.log(
          chalk.cyan.bold("    🎯 System Status: ") +
            chalk.green.bold("ONLINE"),
        );
        console.log("");
      }
    }, 200);

    return;
  }

  // Production mode - simple output
  console.log(
    chalk.gray(
      "    ┌─────────────────────────────────────────────────────────┐",
    ),
  );
  console.log(
    chalk.gray("    │") +
      chalk.green.bold("  🌐 Production server running") +
      chalk.gray("                         │"),
  );
  console.log(
    chalk.gray("    │") +
      chalk.blue.bold(`  🔗 http://localhost:${PORT}`) +
      chalk.gray("                                  │"),
  );
  console.log(
    chalk.gray(
      "    └─────────────────────────────────────────────────────────┘",
    ),
  );
  console.log("");
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

// Helper function to get module icons
function getModuleIcon(module) {
  const icons = {
    account: "👤",
    audit_logs: "📊",
    auth: "🔐",
    hosts: "🖥️",
    image: "💿",
    instance: "📦",
    network: "🌐",
    websocket: "🔌",
  };
  return icons[module] || "⚙️";
}
