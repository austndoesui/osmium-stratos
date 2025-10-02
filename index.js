const express = require("express");
const path = require("path");
const config = require("./handlers/config");
const db = require("./handlers/db");
const router = require("./handlers/router");
const http = require("http");
const websocket = require("./modules/websocket");
const moduleHandler = require("./handlers/module_handler");
const fs = require("fs");
const chalk = require("chalk");
const securityAndLoggingMiddleware = require("./handlers/middleware");

const app = express();
const PORT = process.env.PORT || config.server.port || 3000;

// Trust proxy headers for accurate IP detection (secure configuration)
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

// ========== MIDDLEWARE ==========
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(securityAndLoggingMiddleware);

// ========== ROUTES ==========
app.use("/api", router);
// REMOVE: app.use('/public', express.static(path.join(__dirname, 'public')));
// Only serve the main frontend app
app.use(express.static(path.join(__dirname, "app", "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "app", "dist", "index.html"));
});

// ========== SERVER ==========
const server = http.createServer(app);
websocket.setupWebSocketServer(server);

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
