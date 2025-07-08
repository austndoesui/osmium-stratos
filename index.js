const express = require('express');
const path = require('path');
const config = require('./handlers/config');
const db = require('./handlers/db');
const router = require('./handlers/router');
const http = require('http');
const websocket = require('./modules/websocket');
const moduleHandler = require('./handlers/module_handler');

const app = express();
const PORT = process.env.PORT || config.server.port || 3000;

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use((req, res, next) => {
  if (config.mode !== 'production') {
    console.log('Incoming request:', req.method, req.url);
  }
  next();
});

// ========== ROUTES ==========
app.use('/api', router);
app.use(express.static(path.join(__dirname, 'app', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'dist', 'index.html'));
});

// ========== SERVER ==========
if (config.mode !== 'production') {
  console.log('Loaded modules:', Object.keys(moduleHandler));
}

const server = http.createServer(app);
websocket.setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Osmium panel is running on http://localhost:${PORT}`);
});
