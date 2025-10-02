const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const validator = require('validator');
const xss = require('xss');

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`🚨 Rate limit exceeded from IP: ${req.ip} - ${req.method} ${req.path}`);
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Brute force protection using express-rate-limit (more secure than express-brute)
const createBruteForceLimit = (windowMs, max, message, skipSuccessfulRequests = true) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests, // Don't count successful requests toward the limit
    handler: (req, res) => {
      console.warn(`🚨 Brute force protection triggered for IP: ${req.ip} on ${req.path}`);
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        blockedUntil: new Date(Date.now() + windowMs).toISOString()
      });
    }
  });
};

// Enhanced brute force protection for authentication endpoints
const bruteForceProtection = createBruteForceLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 failed attempts per 15 minutes
  'Too many failed attempts. Account temporarily locked.',
  true // Only count failed requests
);

// Different rate limits for different endpoints
const rateLimits = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per 15 minutes
    'Too many requests from this IP, please try again later.'
  ),
  
  // Strict rate limit for authentication endpoints
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per 15 minutes
    'Too many authentication attempts, please try again later.'
  ),
  
  // Medium rate limit for user creation
  userActions: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    10, // 10 requests per 5 minutes
    'Too many user actions, please try again later.'
  ),
  
  // Very strict for password reset
  passwordReset: createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts per hour
    'Too many password reset attempts, please try again later.'
  ),

  // Brute force protection specifically for failed login attempts
  bruteForce: bruteForceProtection
};

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some frontend functionality
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
const corsConfig = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:5173'
    ];
    
    // In production, add your actual domain
    if (process.env.NODE_ENV === 'production') {
      // Add your production domains here
      // allowedOrigins.push('https://yourdomain.com');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚨 CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
});

// Input sanitization and validation
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // XSS protection
        req.body[key] = xss(req.body[key]);
        // Trim whitespace
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

// SQL injection protection for query parameters
const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi
  ];
  
  const checkForSQLInjection = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };
  
  // Check all inputs
  const allInputs = { ...req.body, ...req.query, ...req.params };
  
  for (const [key, value] of Object.entries(allInputs)) {
    if (checkForSQLInjection(value)) {
      console.warn(`🚨 SQL injection attempt detected from IP: ${req.ip} - Key: ${key}, Value: ${value}`);
      return res.status(400).json({ 
        error: 'Invalid input detected. Please check your request.' 
      });
    }
  }
  
  next();
};

module.exports = {
  rateLimits,
  helmetConfig,
  corsConfig,
  sanitizeInput,
  sqlInjectionProtection,
  bruteForceProtection,
  hpp: hpp() // HTTP Parameter Pollution protection
};