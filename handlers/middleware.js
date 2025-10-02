const chalk = require('chalk');
const config = require('./config');

function securityAndLoggingMiddleware(req, res, next) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (config.mode !== 'production') {
    const timestamp = new Date().toLocaleTimeString();
    const method = req.method;
    const url = req.url;
    // Get real client IP (handles proxies)
    const ip = req.headers['cf-connecting-ip'] ||
               req.headers['x-real-ip'] ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               (req.ip === '::1' ? '127.0.0.1' : req.ip) ||
               'unknown';

    // Categorize requests for better organization
    let category = '📄';
    let color = chalk.gray;

    if (url.startsWith('/api/')) {
      if (url.includes('/login') || url.includes('/register') || url.includes('/logout')) {
        category = '🔐';
        color = chalk.yellow;
      } else if (url.includes('/hosts') || url.includes('/vms') || url.includes('/images')) {
        category = '🖥️ ';
        color = chalk.blue;
      } else if (url.includes('/users') || url.includes('/account')) {
        category = '👤';
        color = chalk.green;
      } else {
        category = '🔧';
        color = chalk.cyan;
      }
    }

    console.log(color(`${category} [${timestamp}] ${method} ${url} ← ${ip}`));
  }
  next();
}

module.exports = securityAndLoggingMiddleware;
