// Load environment variables from .env file
require('dotenv').config();

// Configuration object using environment variables
const config = {
  mode: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost'
  },
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'replace-this-with-a-long-random-secret-key'
  }
};

module.exports = config;
