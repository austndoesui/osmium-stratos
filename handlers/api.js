<<<<<<< Updated upstream
const express = require('express');
const hosts = require('../modules/hosts');
const instance = require('../modules/instance');
const imageModule = require('../modules/image');
const axios = require('axios');
const cheerio = require('cheerio');
const websocket = require('../modules/websocket');
const { setupAuth } = require('../modules/auth');
const db = require('./db');
const { getAllUsers, deleteUserById } = require('./get-users');
const bcrypt = require('bcrypt');
const { updateProfile, changePassword } = require('../modules/account');
const network = require('../modules/network');
const auditLogs = require('../modules/audit_logs');
const snapshot = require('../modules/snapshot');
=======
const express = require("express");
const hosts = require("../modules/hosts");
const instance = require("../modules/instance");
const imageModule = require("../modules/image");
const axios = require("axios");
const cheerio = require("cheerio");
const websocket = require("../modules/websocket");
const { setupAuth } = require("../modules/auth");
const db = require("./db");
const { getAllUsers, deleteUserById } = require("./get-users");
const bcrypt = require("bcrypt");
const { updateProfile, changePassword } = require("../modules/account");
const network = require("../modules/network");
const auditLogs = require("../modules/audit_logs");
const snapshot = require("../modules/snapshot");
const { verify2FA } = require("../modules/2fa");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const crypto = require("crypto");
const { migrateInstance } = require("../modules/migrate");
const settings = require("../modules/settings");
const path = require("path");
const fs = require("fs");
>>>>>>> Stashed changes

const router = express.Router();

// Apply Passport.js auth
setupAuth(router);

<<<<<<< Updated upstream
=======
// 2FA login verification endpoint
router.post("/2fa/verify-login", async (req, res) => {
  const { user_id, token } = req.body;
  if (!user_id || !token) {
    return res
      .status(400)
      .json({ error: "User ID and 2FA code are required." });
  }
  db.get("SELECT * FROM users WHERE id = ?", [user_id], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: "Invalid user." });
    const valid = await verify2FA(user_id, token);
    if (!valid) return res.status(401).json({ error: "Invalid 2FA code." });
    const jwt = require("jsonwebtoken");
    const config = require("./config");
    const JWT_SECRET =
      config.session.secret || "replace-this-with-a-long-random-secret-key";
    const jwtToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "10m" },
    );
    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  });
});

>>>>>>> Stashed changes
// ================= HOSTS =================
router.get("/hosts", (req, res) => {
  hosts.listHosts((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get("/hosts/:id", (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    res.json(host);
  });
});

router.post("/hosts", (req, res) => {
  let { name, address, description, cert, key, ca } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: "Name and address are required" });
  }
  if (!/^https?:\/\//.test(address)) {
    address = `https://${address}`;
  }
  if (!/:[0-9]+$/.test(address)) {
    address = `${address}:8443`;
  }
  hosts.addHost(
    { name, address, description, cert, key, ca },
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.id });
    },
  );
});

router.delete("/hosts/:id", (req, res) => {
  hosts.deleteHost(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

router.post("/hosts/:id/verify", (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    let responded = false;
    const done = (data) => {
      if (!responded) {
        responded = true;
        res.status(200).json(data);
      }
    };
    const reqHttps = require("https").request(
      {
        hostname: new URL(host.address).hostname,
        port: new URL(host.address).port,
        path: "/1.0",
        method: "GET",
        cert: host.cert,
        key: host.key,
        ca: host.ca || undefined,
        rejectUnauthorized: false,
        timeout: 5000,
      },
      (verifyRes) => {
        if (verifyRes.statusCode === 200) {
          done({ status: "online" });
        } else {
          done({ status: "offline", error: "LXD API did not return 200 OK" });
        }
      },
    );
    reqHttps.on("error", (err) => {
      done({ status: "offline", error: err.message });
    });
    reqHttps.on("timeout", function () {
      this.destroy();
      done({ status: "offline", error: "Connection timed out" });
    });
    reqHttps.end();
  });
});

// ================= IMAGES =================
router.get("/images", (req, res) => {
  imageModule.getImages((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/images", (req, res) => {
  const { label, value } = req.body;
  if (!label || !value) {
    return res.status(400).json({ error: "Label and value are required" });
  }
  imageModule.addImage({ label, value }, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.id });
  });
});

router.delete("/images/:id", (req, res) => {
  imageModule.deleteImage(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

router.post("/hosts/:id/images", (req, res) => {
  const { imageAlias } = req.body;
  if (!imageAlias) {
    return res.status(400).json({ error: "Image alias is required" });
  }
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    hosts.copyImageToHost(host, imageAlias, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Image saved", result });
    });
  });
});

// ================= INSTANCES =================
router.post("/hosts/:id/vms", (req, res) => {
  const { name, imageAlias, type, user_id, cpu, ram, disk } = req.body;
  if (!name || !imageAlias) {
    return res
      .status(400)
      .json({ error: "Instance name and image alias are required" });
  }
  if (user_id) {
    db.get("SELECT id FROM users WHERE id = ?", [user_id], (err, row) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error checking user_id" });
      if (!row)
        return res.status(400).json({ error: "Selected user does not exist" });
      proceed();
    });
  } else {
    proceed();
  }
  function proceed() {
    hosts.getHost(req.params.id, (err, host) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!host) return res.status(404).json({ error: "Host not found" });
      instance.createVM(
        host,
        { name, imageAlias, type, cpu, ram, disk },
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          const dbParams = [
            name,
            host.id,
            name,
            user_id || null,
            cpu || null,
            ram || null,
            disk || null,
            imageAlias,
          ];
          db.run(
            "INSERT INTO instances (name, host_id, lxd_name, user_id, cpu, ram, disk, image_alias) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            dbParams,
            function (dbErr) {
              if (dbErr) {
                // Still return LXD result, but warn about DB
                return res.status(201).json({
                  ...result,
                  dbWarning: "Instance created in LXD but not saved in DB.",
                });
              }
              res.status(201).json({ ...result, instance_id: this.lastID });
            },
          );
        },
      );
    });
  }
});

router.get("/vms", (req, res) => {
  hosts.listHosts((err, hostRows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!hostRows.length) return res.json([]);
    let results = [];
    let completed = 0;
    hostRows.forEach((host) => {
      instance.listVMsOnHost(host, async (err, vms) => {
        if (err) {
          results.push({
            host: { id: host.id, name: host.name, address: host.address },
            vms: { error: err.message },
          });
        } else {
          const dbInstances = await new Promise((resolve) => {
            db.all(
              `SELECT i.name, i.user_id, i.image_alias, u.username, u.email FROM instances i LEFT JOIN users u ON i.user_id = u.id WHERE i.host_id = ?`,
              [host.id],
              (dbErr, rows) => {
                if (dbErr) resolve([]);
                else resolve(rows);
              },
            );
          });
          const vmsWithOwner = Array.isArray(vms)
            ? vms.map((vm) => {
                const dbInst = dbInstances.find((i) => i.name === vm.name);
                return {
                  ...vm,
                  owner:
                    dbInst && dbInst.user_id
                      ? { username: dbInst.username, email: dbInst.email }
                      : null,
                  image:
                    dbInst && dbInst.image_alias
                      ? dbInst.image_alias
                      : vm.image,
                };
              })
            : vms;
          results.push({
            host: { id: host.id, name: host.name, address: host.address },
            vms: vmsWithOwner,
          });
        }
        completed++;
        if (completed === hostRows.length) {
          res.json(results);
        }
      });
    });
  });
});

router.delete("/hosts/:id/vms/:name", (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    instance.deleteInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run(
        "DELETE FROM instances WHERE host_id = ? AND name = ?",
        [host.id, req.params.name],
        function (dbErr) {
          if (dbErr) {
          }
          res.status(204).end();
        },
      );
    });
  });
});

router.get("/instances/:id/audit-logs", async (req, res) => {
  try {
    const logs = await auditLogs.getAuditLogsForInstance(req.params.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/hosts/:id/vms/:name/history", async (req, res) => {
  try {
    db.get(
      "SELECT id FROM instances WHERE host_id = ? AND name = ? COLLATE NOCASE",
      [req.params.id, req.params.name],
      async (err, instance) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        if (!instance) {
          return res.status(404).json({ error: "Instance not found" });
        }
        try {
          let logs = await auditLogs.getAuditLogsForInstance(instance.id);
          if (logs.length === 0) {
            logs = await new Promise((resolve, reject) => {
              db.all(
                "SELECT * FROM audit_logs WHERE instance_name = ? COLLATE NOCASE AND host_id = ? ORDER BY timestamp DESC",
                [req.params.name, req.params.id],
                (err, rows) => {
                  if (err) return reject(err);
                  resolve(rows);
                },
              );
            });
          }
          const simplifiedLogs = logs.map((log) => {
            const newLog = { ...log };
            if (newLog.details) {
              if (typeof newLog.details === "string") {
              } else {
                try {
                  newLog.details = JSON.stringify(newLog.details);
                } catch (e) {
                  newLog.details = String(newLog.details);
                }
              }
            }
            return newLog;
          });
          res.json(simplifiedLogs);
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      },
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hosts/:id/vms/:name/start", (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    instance.startInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT id FROM instances WHERE name = ? AND host_id = ?",
        [req.params.name, req.params.id],
        (dbErr, inst) => {
          auditLogs.addAuditLog({
            user_id: req.user?.id || null,
            username: req.user?.username || "system",
            action: "start",
            instance_id: inst?.id,
            instance_name: req.params.name,
            host_id: req.params.id,
            details: { result },
          });
        },
      );
      res.status(200).json(result);
    });
  });
});

router.post("/hosts/:id/vms/:name/stop", (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    instance.stopInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT id FROM instances WHERE name = ? AND host_id = ?",
        [req.params.name, req.params.id],
        (dbErr, inst) => {
          auditLogs.addAuditLog({
            user_id: req.user?.id || null,
            username: req.user?.username || "system",
            action: "stop",
            instance_id: inst?.id,
            instance_name: req.params.name,
            host_id: req.params.id,
            details: { result },
          });
        },
      );
      res.status(200).json(result);
    });
  });
});

router.post("/hosts/:id/vms/:name/restart", (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    instance.restartInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT id FROM instances WHERE name = ? AND host_id = ?",
        [req.params.name, req.params.id],
        (dbErr, inst) => {
          auditLogs.addAuditLog({
            user_id: req.user?.id || null,
            username: req.user?.username || "system",
            action: "restart",
            instance_id: inst?.id,
            instance_name: req.params.name,
            host_id: req.params.id,
            details: { result },
          });
        },
      );
      res.status(200).json(result);
    });
  });
});

router.get("/hosts/:id/vms/:name/console", (req, res) => {
  res.status(426).json({ error: "Please connect via WebSocket." });
});

// ================= USERS =================
router.post("/register", async (req, res) => {
  const { username, email, password, password_hash, role } = req.body;
  if (!username || !email || (!password && !password_hash)) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required." });
  }
  try {
    const hash = password_hash || (await bcrypt.hash(password, 10));
    const userRole =
      role && (role === "admin" || role === "user") ? role : "user";
    db.run(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [username, email, hash, userRole],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            return res
              .status(409)
              .json({ error: "Username or email already exists." });
          }
          return res.status(500).json({ error: "Database error." });
        }
        res.status(201).json({
          success: true,
          id: this.lastID,
          username,
          email,
          role: userRole,
        });
      },
    );
  } catch (e) {
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/users", (req, res) => {
  getAllUsers((err, users) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }
    res.json(users);
  });
});

router.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  deleteUserById(id, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to delete user" });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true });
  });
});

router.post("/logout", (req, res) => {
  res.json({ success: true });
});

// ================= ACCOUNT =================
router.post("/account/update", router.ensureAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { username, email } = req.body;
  try {
    await updateProfile(userId, username, email);
    res.json({ success: true });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: err.message || "Unknown error." });
  }
});

router.post(
  "/account/change-password",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    try {
      await changePassword(userId, currentPassword, newPassword);
      res.json({ success: true });
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Unknown error." });
    }
  },
);

<<<<<<< Updated upstream
=======
// 2FA endpoints
router.get("/account/2fa/status", router.ensureAuthenticated, (req, res) => {
  const userId = req.user.id;
  db.get(
    "SELECT two_fa_enabled FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Failed to get 2FA status" });
      }
      res.json({ enabled: !!user.two_fa_enabled });
    },
  );
});

router.post("/account/2fa/setup", router.ensureAuthenticated, (req, res) => {
  const userId = req.user.id;
  const username = req.user.username;
  const secret = speakeasy.generateSecret({
    name: `Osmium Stratos (${username})`,
    issuer: "Osmium Stratos",
    length: 32,
  });
  const recoveryCodes = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    recoveryCodes.push(code);
  }
  const recoveryCodesJson = JSON.stringify(recoveryCodes);

  db.run(
    "UPDATE users SET two_fa_secret = ?, recovery_codes = ?, two_fa_enabled = 0 WHERE id = ?",
    [secret.base32, recoveryCodesJson, userId],
    function (err) {
      if (err) {
        console.error("2FA Setup DB Error:", err);
        return res
          .status(500)
          .json({ error: "Failed to initialize 2FA setup." });
      }

      qrcode.toDataURL(secret.otpauth_url, (qrCodeErr, qrCodeUrl) => {
        if (qrCodeErr) {
          return res.status(500).json({ error: "Failed to generate QR code" });
        }
        res.json({
          secret: secret.base32,
          qrCode: qrCodeUrl,
          recoveryCodes: recoveryCodes,
        });
      });
    },
  );
});

router.post("/account/2fa/verify", router.ensureAuthenticated, (req, res) => {
  const { token } = req.body; // Secret is no longer passed from frontend for verify
  const userId = req.user.id;
  if (!token) {
    return res.status(400).json({ error: "Verification code is required." });
  }

  db.get(
    "SELECT two_fa_secret, recovery_codes FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Failed to retrieve 2FA data." });
      }
      if (!user || !user.two_fa_secret) {
        return res
          .status(400)
          .json({ error: "2FA setup not initiated or already enabled." });
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_fa_secret,
        encoding: "base32",
        token: token,
        window: 2,
      });

      if (!verified) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      let storedRecoveryCodes = [];
      try {
        if (user.recovery_codes) {
          storedRecoveryCodes = JSON.parse(user.recovery_codes);
        }
      } catch (parseErr) {
        console.error("Failed to parse recovery codes:", parseErr); // Log error but proceed
      }

      db.run(
        "UPDATE users SET two_fa_enabled = 1 WHERE id = ?",
        [userId],
        function (updateErr) {
          if (updateErr) {
            return res.status(500).json({ error: "Failed to enable 2FA" });
          }
          res.json({
            success: true,
            message: "Two-factor authentication enabled successfully!",
            recoveryCodes: storedRecoveryCodes,
          });
        },
      );
    },
  );
});

router.post("/account/2fa/disable", router.ensureAuthenticated, (req, res) => {
  const userId = req.user.id;
  db.run(
    "UPDATE users SET two_fa_secret = NULL, two_fa_enabled = 0, recovery_codes = NULL WHERE id = ?",
    [userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to disable 2FA" });
      }
      res.json({ success: true, message: "2FA disabled successfully" });
    },
  );
});

router.post(
  "/account/2fa/recovery-codes",
  router.ensureAuthenticated,
  (req, res) => {
    const userId = req.user.id;
    db.get(
      "SELECT two_fa_enabled FROM users WHERE id = ?",
      [userId],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        if (!user.two_fa_enabled) {
          return res.status(400).json({ error: "2FA is not enabled" });
        }
        const recoveryCodes = [];
        for (let i = 0; i < 10; i++) {
          const code = crypto.randomBytes(4).toString("hex").toUpperCase();
          recoveryCodes.push(code);
        }
        const recoveryCodesJson = JSON.stringify(recoveryCodes);
        db.run(
          "UPDATE users SET recovery_codes = ? WHERE id = ?",
          [recoveryCodesJson, userId],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({ error: "Failed to regenerate recovery codes" });
            }
            res.json({
              success: true,
              recoveryCodes: recoveryCodes,
            });
          },
        );
      },
    );
  },
);

>>>>>>> Stashed changes
// ================= INSTANCE UTILS =================
router.get("/hosts/:id/vms/:name/usage", (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    instance.getInstanceUsage(host, req.params.name, (err, usage) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json(usage);
    });
  });
});

router.get("/hosts/:id/vms/:name/config", (req, res) => {
  db.get(
    "SELECT cpu, ram, disk FROM instances WHERE host_id = ? AND name = ?",
    [req.params.id, req.params.name],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Instance not found" });
      res.json(row);
    },
  );
});

router.get("/hosts/:id/instance-count", (req, res) => {
  db.get(
    "SELECT COUNT(*) as count FROM instances WHERE host_id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ count: row ? row.count : 0 });
    },
  );
});

// ================= NETWORK =================
router.get("/hosts/:hostId/vms/:instanceName/redirects", (req, res) => {
  network.listPortForwards(
    { host_id: req.params.hostId, instance_name: req.params.instanceName },
    (err, forwards) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(forwards);
    },
  );
});

router.post("/hosts/:hostId/vms/:instanceName/redirects", async (req, res) => {
  try {
    const { container_port, protocol } = req.body;
    if (!container_port)
      return res.status(400).json({ error: "container_port is required" });
    const result = await network.addPortForward({
      host_id: req.params.hostId,
      instance_name: req.params.instanceName,
      container_port,
      protocol: protocol || "tcp",
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete(
  "/hosts/:hostId/vms/:instanceName/redirects/:id",
  async (req, res) => {
    try {
      await network.removePortForward({
        id: req.params.id,
        host_id: req.params.hostId,
        instance_name: req.params.instanceName,
      });
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post("/hosts/:id/vms/:name/resize", (req, res) => {
  const { cpu, ram, disk } = req.body;
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    instance.resizeInstance(
      host,
      req.params.name,
      { cpu, ram, disk },
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          "UPDATE instances SET cpu = ?, ram = ?, disk = ? WHERE host_id = ? AND name = ?",
          [cpu || null, ram || null, disk || null, host.id, req.params.name],
          function (dbErr) {
            if (dbErr) {
              console.error("Failed to update instance specs in DB:", dbErr);

              return res.status(200).json({
                ...result,
                dbWarning: "Specs updated in LXD but not saved in DB.",
              });
            }
            res.status(200).json({ ...result });
          },
        );
      },
    );
  });
});

router.post("/hosts/:hostId/vms/:instanceName/snapshots", (req, res) => {
  hosts.getHost(req.params.hostId, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    const { name, stateful } = req.body;
    snapshot.createSnapshot(
      host,
      req.params.instanceName,
      { name, stateful },
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(result);
      },
    );
  });
});

router.get("/hosts/:hostId/vms/:instanceName/snapshots", (req, res) => {
  hosts.getHost(req.params.hostId, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: "Host not found" });
    snapshot.listSnapshots(host, req.params.instanceName, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
<<<<<<< Updated upstream
      // Transform to match frontend expectations
      const transformed = (result || []).map(snap => ({
        id: snap.name, // Use name as unique id
=======

      const transformed = (result || []).map((snap) => ({
        id: snap.name,
>>>>>>> Stashed changes
        name: snap.name,
        created_at:
          snap.created_at || snap.creation_date || snap.created_at || null,
        size:
          typeof snap.size === "number"
            ? snap.size
            : snap.stateful && snap.stateful_size
              ? snap.stateful_size
              : null,
      }));
      res.json(transformed);
    });
  });
});

router.post(
  "/hosts/:hostId/vms/:instanceName/snapshots/:snapshotName/restore",
  (req, res) => {
    hosts.getHost(req.params.hostId, (err, host) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!host) return res.status(404).json({ error: "Host not found" });
      snapshot.restoreSnapshot(
        host,
        req.params.instanceName,
        req.params.snapshotName,
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(result);
        },
      );
    });
  },
);

router.delete(
  "/hosts/:hostId/vms/:instanceName/snapshots/:snapshotName",
  (req, res) => {
    hosts.getHost(req.params.hostId, (err, host) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!host) return res.status(404).json({ error: "Host not found" });
      snapshot.deleteSnapshot(
        host,
        req.params.instanceName,
        req.params.snapshotName,
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(200).json({ success: true });
        },
      );
    });
  },
);

<<<<<<< Updated upstream
=======
// ================= NOTIFICATIONS =================
router.get("/notifications", router.ensureAuthenticated, (req, res) => {
  db.all(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

router.post(
  "/notifications/:id/read",
  router.ensureAuthenticated,
  (req, res) => {
    db.run(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      },
    );
  },
);

function createNotification({ user_id, title, message, type }) {
  db.run(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [user_id, title, message, type || null],
  );
}
module.exports.createNotification = createNotification;

// ================= INSTANCE MIGRATION =================
router.post(
  "/hosts/:sourceHostId/vms/:instanceName/migrate",
  async (req, res) => {
    const { sourceHostId, instanceName } = req.params;
    const { targetHostId } = req.body;
    if (!targetHostId)
      return res.status(400).json({ error: "targetHostId is required" });
    try {
      const result = await migrateInstance({
        sourceHostId,
        targetHostId,
        instanceName,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ================= SETTINGS =================
router.get("/settings", (req, res) => {
  settings.getAllSettings((err, all) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(all);
  });
});

router.post("/settings", router.ensureAuthenticated, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const updates = req.body;
  const keys = Object.keys(updates);
  if (!keys.length)
    return res.status(400).json({ error: "No settings provided" });
  Promise.all(
    keys.map(
      (key) =>
        new Promise((resolve, reject) => {
          settings.setSetting(key, updates[key], (err) => {
            if (err) reject(err);
            else resolve();
          });
        }),
    ),
  )
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

router.post("/settings/reset", router.ensureAuthenticated, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  db.run(
    "DELETE FROM settings WHERE key IN ('panel_name', 'footer_text', 'logo_url')",
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});

>>>>>>> Stashed changes
module.exports = router;
