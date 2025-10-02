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

const router = express.Router();

// Apply Passport.js auth
setupAuth(router);

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
    let valid = false;
    try {
      valid = await verify2FA(user_id, token);
    } catch (error) {
      console.error("2FA verification error:", error);
      return res.status(500).json({ error: "2FA verification failed." });
    }
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

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new passwords are required." });
    }

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

router.post(
  "/account/2fa/setup",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;

    db.get(
      "SELECT two_fa_enabled, two_fa_secret FROM users WHERE id = ?",
      [userId],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: "Database error." });
        }
        if (!user) {
          return res.status(404).json({ error: "User not found." });
        }

        const secret = speakeasy.generateSecret({
          length: 20,
          name: `Osmium Stratos (${user.username})`,
        });

        const recoveryCodes = Array.from({ length: 5 }, () =>
          crypto.randomBytes(8).toString("hex"),
        );

        db.run(
          "UPDATE users SET two_fa_secret = ?, recovery_codes = ? WHERE id = ?",
          [secret.base32, JSON.stringify(recoveryCodes), userId],
          function (updateErr) {
            if (updateErr) {
              return res.status(500).json({
                error: "Failed to save 2FA secret and recovery codes.",
              });
            }

            qrcode.toDataURL(secret.otpauth_url, (qrErr, imageUrl) => {
              if (qrErr) {
                return res
                  .status(500)
                  .json({ error: "Failed to generate QR code." });
              }
              res.json({
                secret: secret.base32,
                qrCodeImage: imageUrl,
                recoveryCodes: recoveryCodes,
              });
            });
          },
        );
      },
    );
  },
);

router.post(
  "/account/2fa/verify",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;
    const { token, type, recoveryCode } = req.body;

    db.get(
      "SELECT two_fa_secret, recovery_codes FROM users WHERE id = ?",
      [userId],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: "Database error." });
        }
        if (!user || !user.two_fa_secret) {
          return res
            .status(400)
            .json({ error: "2FA not set up for this user." });
        }

        let isTokenValid = false;
        let usedRecoveryCode = null;

        if (type === "token" && token) {
          isTokenValid = speakeasy.totp.verify({
            secret: user.two_fa_secret,
            encoding: "base32",
            token: token,
            window: 1, // Allow a 30-second window either side of the current time
          });
        } else if (type === "recovery" && recoveryCode && user.recovery_codes) {
          const storedRecoveryCodes = JSON.parse(user.recovery_codes);
          const index = storedRecoveryCodes.indexOf(recoveryCode);
          if (index !== -1) {
            isTokenValid = true;
            usedRecoveryCode = recoveryCode;
            storedRecoveryCodes.splice(index, 1); // Remove the used recovery code
            user.recovery_codes = JSON.stringify(storedRecoveryCodes);
          }
        }

        if (isTokenValid) {
          db.run(
            "UPDATE users SET two_fa_enabled = 1, recovery_codes = ? WHERE id = ?",
            [user.recovery_codes, userId],
            function (updateErr) {
              if (updateErr) {
                return res.status(500).json({
                  error: "Failed to enable 2FA or update recovery codes.",
                });
              }
              res.json({
                success: true,
                message: usedRecoveryCode
                  ? "2FA verified with recovery code. This code has been consumed."
                  : "2FA verified and enabled.",
              });
            },
          );
        } else {
          res.status(401).json({ error: "Invalid 2FA code or recovery code." });
        }
      },
    );
  },
);

router.post(
  "/account/2fa/disable",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;

    db.run(
      "UPDATE users SET two_fa_enabled = 0, two_fa_secret = NULL, recovery_codes = NULL WHERE id = ?",
      [userId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Failed to disable 2FA." });
        }
        res.json({ success: true, message: "2FA disabled." });
      },
    );
  },
);

router.get(
  "/account/2fa/status",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;

    db.get(
      "SELECT two_fa_enabled FROM users WHERE id = ?",
      [userId],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: "Database error." });
        }
        if (!user) {
          return res.status(404).json({ error: "User not found." });
        }
        res.json({ two_fa_enabled: user.two_fa_enabled === 1 });
      },
    );
  },
);

router.get(
  "/account/2fa/recovery-codes",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;

    db.get(
      "SELECT recovery_codes FROM users WHERE id = ?",
      [userId],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: "Database error." });
        }
        if (!user || !user.recovery_codes) {
          return res
            .status(404)
            .json({ error: "No recovery codes found for this user." });
        }
        res.json({ recoveryCodes: JSON.parse(user.recovery_codes) });
      },
    );
  },
);

// ================= ADMIN =================
router.post(
  "/admin/settings/update",
  router.ensureAuthenticated,
  router.ensureAdmin,
  async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) {
      return res.status(400).json({ error: "Key and value are required." });
    }
    try {
      await settings.set(key, value);
      res.json({ success: true, message: "Setting updated." });
    } catch (error) {
      res.status(500).json({ error: "Failed to update setting." });
    }
  },
);

router.get(
  "/admin/settings/:key",
  router.ensureAuthenticated,
  router.ensureAdmin,
  async (req, res) => {
    try {
      const value = await settings.get(req.params.key);
      res.json({ key: req.params.key, value: value });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve setting." });
    }
  },
);

router.get(
  "/admin/settings",
  router.ensureAuthenticated,
  router.ensureAdmin,
  async (req, res) => {
    try {
      const allSettings = await settings.getAll();
      res.json(allSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve all settings." });
    }
  },
);

router.post(
  "/admin/notifications/create",
  router.ensureAuthenticated,
  router.ensureAdmin,
  async (req, res) => {
    const { user_id, title, message, type } = req.body;
    try {
      const notificationId = await settings.createNotification(
        user_id,
        title,
        message,
        type,
      );
      res.status(201).json({ success: true, id: notificationId });
    } catch (error) {
      res.status(500).json({ error: "Failed to create notification." });
    }
  },
);

router.get("/notifications", router.ensureAuthenticated, async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await settings.getNotifications(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve notifications." });
  }
});

router.post(
  "/notifications/:id/read",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;
    const notificationId = req.params.id;
    try {
      await settings.markNotificationAsRead(userId, notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read." });
    }
  },
);

router.post(
  "/notifications/read-all",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;
    try {
      await settings.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to mark all notifications as read." });
    }
  },
);

router.post(
  "/notifications/:id/delete",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;
    const notificationId = req.params.id;
    try {
      await settings.deleteNotification(userId, notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification." });
    }
  },
);

router.post(
  "/notifications/delete-all",
  router.ensureAuthenticated,
  async (req, res) => {
    const userId = req.user.id;
    try {
      await settings.deleteAllNotifications(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete all notifications." });
    }
  },
);

module.exports = router;
