const express = require('express');
const path = require('path');
const config = require('./handlers/config');
const db = require('./handlers/db');
const router = require('./handlers/router');
const http = require('http');
const websocket = require('./modules/websocket');

const app = express();
const PORT = process.env.PORT || config.server.port || 3000;

// Parse JSON bodiesy
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

// Mount API routes at /api
app.use('/api', router);

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, 'app', 'dist')));

// For any other requests, send back React's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'dist', 'index.html'));
});

const server = http.createServer(app);

websocket.setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Osmium panel is running on http://localhost:${PORT}`);
});
