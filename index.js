const express = require('express');
const path = require('path');
const config = require('./handlers/config');
const db = require('./handlers/db');
const router = require('./handlers/router');
const http = require('http');
const websocket = require('./modules/websocket');
const moduleHandler = require('./handlers/module_handler');
const fs = require('fs');
const chalk = require('chalk');

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
const server = http.createServer(app);
websocket.setupWebSocketServer(server);

server.listen(PORT, () => {
  // Display ASCII art directly on startup (copied exactly from art.txt, with escaped backslashes)
  console.log(chalk.white(`
   ____   _____ __  __ _____ _    _ __  __  
  / __ \\ / ____|  \\/  |_   _| |  | |  \\/  | 
 | |  | | (___ | \\  / | | | | |  | | \\  / | 
 | |  | |\\___ \\| |\\/| | | | |  | | |\\/| | 
 | |__| |____) | |  | |_| |_| |__| | |  | | 
  \\____/|_____/|_|  |_|_____|\\____/|_|  |_| 
                                            
                                            
`));
  console.log(chalk.white.bold('╔══════════════════════════════════════════╗'));
  console.log(chalk.white.bold('║         Osmium ( stratos ) 0.1x         ║'));
  console.log(chalk.white.bold('╚══════════════════════════════════════════╝'));
  if (config.mode !== 'production') {
    const modules = Object.keys(moduleHandler);
    const colWidth = Math.max(...modules.map(m => m.length), 15) + 2;
    const header = `|${' Loaded Modules'.padEnd(colWidth - 1)}|`;
    const sep = '+' + '-'.repeat(colWidth) + '+';
    // Loader animation
    let dots = 0;
    const loaderText = 'Initializing modules';
    process.stdout.write(chalk.yellow(loaderText));
    const loaderInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(chalk.yellow(loaderText + '.'.repeat(dots)));
    }, 500);
    setTimeout(() => {
      clearInterval(loaderInterval);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      // Print the table
      console.log(chalk.yellow(sep));
      console.log(chalk.yellow(header));
      console.log(chalk.yellow(sep));
      modules.forEach((mod, idx) => {
        console.log(chalk.yellow(`| ${mod.padEnd(colWidth - 2)}|`));
        if (idx < modules.length - 1) {
          console.log(chalk.yellow(sep));
        }
      });
      console.log(chalk.yellow(sep));
      // Print the rest of the startup message
      console.log(chalk.green(`Osmium panel is running on http://localhost:${PORT}`));
    }, 3000);
    return; // Prevents double printing of the URL
  }
  console.log(chalk.green(`Osmium panel is running on http://localhost:${PORT}`));
});
