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

const router = express.Router();

// Apply Passport.js auth
setupAuth(router);

// ================= HOSTS =================
router.get('/hosts', (req, res) => {
  hosts.listHosts((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/hosts/:id', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    res.json(host);
  });
});

router.post('/hosts', (req, res) => {
  let { name, address, description, cert, key, ca } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: 'Name and address are required' });
  }
  if (!/^https?:\/\//.test(address)) {
    address = `https://${address}`;
  }
  if (!/:[0-9]+$/.test(address)) {
    address = `${address}:8443`;
  }
  hosts.addHost({ name, address, description, cert, key, ca }, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.id });
  });
});

router.delete('/hosts/:id', (req, res) => {
  hosts.deleteHost(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

router.post('/hosts/:id/verify', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    let responded = false;
    const done = (data) => {
      if (!responded) {
        responded = true;
        res.status(200).json(data);
      }
    };
    const reqHttps = require('https').request({
      hostname: new URL(host.address).hostname,
      port: new URL(host.address).port,
      path: '/1.0',
      method: 'GET',
      cert: host.cert,
      key: host.key,
      ca: host.ca || undefined,
      rejectUnauthorized: false,
      timeout: 5000,
    }, (verifyRes) => {
      if (verifyRes.statusCode === 200) {
        done({ status: 'online' });
      } else {
        done({ status: 'offline', error: 'LXD API did not return 200 OK' });
      }
    });
    reqHttps.on('error', (err) => {
      done({ status: 'offline', error: err.message });
    });
    reqHttps.on('timeout', function() {
      this.destroy();
      done({ status: 'offline', error: 'Connection timed out' });
    });
    reqHttps.end();
  });
});

// ================= IMAGES =================
router.get('/images', (req, res) => {
  imageModule.getImages((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/images', (req, res) => {
  const { label, value } = req.body;
  if (!label || !value) {
    return res.status(400).json({ error: 'Label and value are required' });
  }
  imageModule.addImage({ label, value }, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.id });
  });
});

router.delete('/images/:id', (req, res) => {
  imageModule.deleteImage(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

router.post('/hosts/:id/images', (req, res) => {
  const { imageAlias } = req.body;
  if (!imageAlias) {
    return res.status(400).json({ error: 'Image alias is required' });
  }
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    hosts.copyImageToHost(host, imageAlias, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Image saved', result });
    });
  });
});

// ================= INSTANCES =================
router.post('/hosts/:id/vms', (req, res) => {
  const { name, imageAlias, type, user_id, cpu, ram, disk } = req.body;
  if (!name || !imageAlias) {
    return res.status(400).json({ error: 'Instance name and image alias are required' });
  }
  if (user_id) {
    db.get('SELECT id FROM users WHERE id = ?', [user_id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error checking user_id' });
      if (!row) return res.status(400).json({ error: 'Selected user does not exist' });
      proceed();
    });
  } else {
    proceed();
  }
  function proceed() {
    hosts.getHost(req.params.id, (err, host) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!host) return res.status(404).json({ error: 'Host not found' });
      instance.createVM(host, { name, imageAlias, type, cpu, ram, disk }, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        const dbParams = [name, host.id, name, user_id || null, cpu || null, ram || null, disk || null, imageAlias];
        db.run(
          'INSERT INTO instances (name, host_id, lxd_name, user_id, cpu, ram, disk, image_alias) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          dbParams,
          function (dbErr) {
            if (dbErr) {
              // Still return LXD result, but warn about DB
              return res.status(201).json({ ...result, dbWarning: 'Instance created in LXD but not saved in DB.' });
            }
            res.status(201).json({ ...result, instance_id: this.lastID });
          }
        );
      });
    });
  }
});

router.get('/vms', (req, res) => {
  hosts.listHosts((err, hostRows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!hostRows.length) return res.json([]);
    let results = [];
    let completed = 0;
    hostRows.forEach((host) => {
      instance.listVMsOnHost(host, async (err, vms) => {
        if (err) {
          results.push({ host: { id: host.id, name: host.name, address: host.address }, vms: { error: err.message } });
        } else {
          const dbInstances = await new Promise((resolve) => {
            db.all(
              `SELECT i.name, i.user_id, i.image_alias, u.username, u.email FROM instances i LEFT JOIN users u ON i.user_id = u.id WHERE i.host_id = ?`,
              [host.id],
              (dbErr, rows) => {
                if (dbErr) resolve([]);
                else resolve(rows);
              }
            );
          });
          const vmsWithOwner = Array.isArray(vms) ? vms.map(vm => {
            const dbInst = dbInstances.find(i => i.name === vm.name);
            return {
              ...vm,
              owner: dbInst && dbInst.user_id ? { username: dbInst.username, email: dbInst.email } : null,
              image: dbInst && dbInst.image_alias ? dbInst.image_alias : vm.image,
            };
          }) : vms;
          results.push({ host: { id: host.id, name: host.name, address: host.address }, vms: vmsWithOwner });
        }
        completed++;
        if (completed === hostRows.length) {
          res.json(results);
        }
      });
    });
  });
});

router.delete('/hosts/:id/vms/:name', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.deleteInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run('DELETE FROM instances WHERE host_id = ? AND name = ?', [host.id, req.params.name], function(dbErr) {
        if (dbErr) {
        }
        res.status(204).end();
      });
    });
  });
});

router.get('/instances/:id/audit-logs', async (req, res) => {
  try {
    const logs = await auditLogs.getAuditLogsForInstance(req.params.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/hosts/:id/vms/:name/history', async (req, res) => {
  try {
    db.get('SELECT id FROM instances WHERE host_id = ? AND name = ? COLLATE NOCASE', [req.params.id, req.params.name], async (err, instance) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }
      try {
        let logs = await auditLogs.getAuditLogsForInstance(instance.id);
        if (logs.length === 0) {
          logs = await new Promise((resolve, reject) => {
            db.all(
              'SELECT * FROM audit_logs WHERE instance_name = ? COLLATE NOCASE AND host_id = ? ORDER BY timestamp DESC',
              [req.params.name, req.params.id],
              (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
              }
            );
          });
        }
        const simplifiedLogs = logs.map(log => {
          const newLog = { ...log };
          if (newLog.details) {
            if (typeof newLog.details === 'string') {
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/hosts/:id/vms/:name/start', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.startInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT id FROM instances WHERE name = ? AND host_id = ?', [req.params.name, req.params.id], (dbErr, inst) => {
        auditLogs.addAuditLog({
          user_id: req.user?.id || null,
          username: req.user?.username || 'system',
          action: 'start',
          instance_id: inst?.id,
          instance_name: req.params.name,
          host_id: req.params.id,
          details: { result }
        });
      });
      res.status(200).json(result);
    });
  });
});

router.post('/hosts/:id/vms/:name/stop', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.stopInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT id FROM instances WHERE name = ? AND host_id = ?', [req.params.name, req.params.id], (dbErr, inst) => {
        auditLogs.addAuditLog({
          user_id: req.user?.id || null,
          username: req.user?.username || 'system',
          action: 'stop',
          instance_id: inst?.id,
          instance_name: req.params.name,
          host_id: req.params.id,
          details: { result }
        });
      });
      res.status(200).json(result);
    });
  });
});

router.post('/hosts/:id/vms/:name/restart', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.restartInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT id FROM instances WHERE name = ? AND host_id = ?', [req.params.name, req.params.id], (dbErr, inst) => {
        auditLogs.addAuditLog({
          user_id: req.user?.id || null,
          username: req.user?.username || 'system',
          action: 'restart',
          instance_id: inst?.id,
          instance_name: req.params.name,
          host_id: req.params.id,
          details: { result }
        });
      });
      res.status(200).json(result);
    });
  });
});

router.get('/hosts/:id/vms/:name/console', (req, res) => {
  res.status(426).json({ error: 'Please connect via WebSocket.' });
});

// ================= USERS =================
router.post('/register', async (req, res) => {
  const { username, email, password, password_hash, role } = req.body;
  if (!username || !email || (!password && !password_hash)) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }
  try {
    const hash = password_hash || await bcrypt.hash(password, 10);
    const userRole = role && (role === 'admin' || role === 'user') ? role : 'user';
    db.run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hash, userRole],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username or email already exists.' });
          }
          return res.status(500).json({ error: 'Database error.' });
        }
        res.status(201).json({ success: true, id: this.lastID, username, email, role: userRole });
      }
    );
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/users', (req, res) => {
  getAllUsers((err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(users);
  });
});

router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  deleteUserById(id, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  });
});

router.post('/logout', (req, res) => {
  res.json({ success: true });
});

// ================= ACCOUNT =================
router.post('/account/update', router.ensureAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { username, email } = req.body;
  try {
    await updateProfile(userId, username, email);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Unknown error.' });
  }
});

router.post('/account/change-password', router.ensureAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  try {
    await changePassword(userId, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Unknown error.' });
  }
});

// ================= INSTANCE UTILS =================
router.get('/hosts/:id/vms/:name/usage', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.getInstanceUsage(host, req.params.name, (err, usage) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json(usage);
    });
  });
});

router.get('/hosts/:id/vms/:name/config', (req, res) => {
  db.get(
    'SELECT cpu, ram, disk FROM instances WHERE host_id = ? AND name = ?',
    [req.params.id, req.params.name],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Instance not found' });
      res.json(row);
    }
  );
});

router.get('/hosts/:id/instance-count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM instances WHERE host_id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ count: row ? row.count : 0 });
  });
});

// ================= NETWORK =================
router.get('/hosts/:hostId/vms/:instanceName/redirects', (req, res) => {
  network.listPortForwards(
    { host_id: req.params.hostId, instance_name: req.params.instanceName },
    (err, forwards) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(forwards);
    }
  );
});

router.post('/hosts/:hostId/vms/:instanceName/redirects', async (req, res) => {
  try {
    const { container_port, protocol } = req.body;
    if (!container_port) return res.status(400).json({ error: 'container_port is required' });
    const result = await network.addPortForward({
      host_id: req.params.hostId,
      instance_name: req.params.instanceName,
      container_port,
      protocol: protocol || 'tcp',
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/hosts/:hostId/vms/:instanceName/redirects/:id', async (req, res) => {
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
});

router.post('/hosts/:id/vms/:name/resize', (req, res) => {
  const { cpu, ram, disk } = req.body;
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.resizeInstance(host, req.params.name, { cpu, ram, disk }, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
     
      db.run(
        'UPDATE instances SET cpu = ?, ram = ?, disk = ? WHERE host_id = ? AND name = ?',
        [cpu || null, ram || null, disk || null, host.id, req.params.name],
        function(dbErr) {
          if (dbErr) {
            console.error('Failed to update instance specs in DB:', dbErr);
           
            return res.status(200).json({ ...result, dbWarning: 'Specs updated in LXD but not saved in DB.' });
          }
          res.status(200).json({ ...result });
        }
      );
    });
  });
});


router.post('/hosts/:hostId/vms/:instanceName/snapshots', (req, res) => {
  hosts.getHost(req.params.hostId, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    const { name, stateful } = req.body;
    snapshot.createSnapshot(host, req.params.instanceName, { name, stateful }, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(result);
    });
  });
});


router.get('/hosts/:hostId/vms/:instanceName/snapshots', (req, res) => {
  hosts.getHost(req.params.hostId, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    snapshot.listSnapshots(host, req.params.instanceName, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      // Transform to match frontend expectations
      const transformed = (result || []).map(snap => ({
        id: snap.name, // Use name as unique id
        name: snap.name,
        created_at: snap.created_at || snap.creation_date || snap.created_at || null,
        size: typeof snap.size === 'number' ? snap.size : (snap.stateful && snap.stateful_size ? snap.stateful_size : null)
      }));
      res.json(transformed);
    });
  });
});


router.post('/hosts/:hostId/vms/:instanceName/snapshots/:snapshotName/restore', (req, res) => {
  hosts.getHost(req.params.hostId, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    snapshot.restoreSnapshot(host, req.params.instanceName, req.params.snapshotName, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  });
});


router.delete('/hosts/:hostId/vms/:instanceName/snapshots/:snapshotName', (req, res) => {
  hosts.getHost(req.params.hostId, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    snapshot.deleteSnapshot(host, req.params.instanceName, req.params.snapshotName, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json({ success: true });
    });
  });
});

module.exports = router;
