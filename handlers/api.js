const express = require('express');
const hosts = require('../modules/hosts');
const instance = require('../modules/instance');
const imageModule = require('../modules/image');
const axios = require('axios');
const cheerio = require('cheerio');
const websocket = require('../modules/websocket');

const router = express.Router();

// List all hosts
router.get('/hosts', (req, res) => {
  hosts.listHosts((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get a single host (for frontend to get address)
router.get('/hosts/:id', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    res.json(host);
  });
});

// Add a new host
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

// Delete a host
router.delete('/hosts/:id', (req, res) => {
  hosts.deleteHost(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

// Verify a host's connection status
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

// Create a VM or container on a host
router.post('/hosts/:id/vms', (req, res) => {
  const { name, imageAlias, type } = req.body;
  if (!name || !imageAlias) {
    return res.status(400).json({ error: 'Instance name and image alias are required' });
  }
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.createVM(host, { name, imageAlias, type }, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(result);
    });
  });
});

// List available images from database
router.get('/images', (req, res) => {
  imageModule.getImages((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new image
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

// Delete an image
router.delete('/images/:id', (req, res) => {
  imageModule.deleteImage(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

// Save (copy) an image to a host
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

// List all VMs/containers on all hosts
router.get('/vms', (req, res) => {
  hosts.listHosts((err, hostRows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!hostRows.length) return res.json([]);
    let results = [];
    let completed = 0;
    hostRows.forEach((host) => {
      instance.listVMsOnHost(host, (err, vms) => {
        results.push({ host: { id: host.id, name: host.name, address: host.address }, vms: err ? { error: err.message } : vms });
        completed++;
        if (completed === hostRows.length) {
          res.json(results);
        }
      });
    });
  });
});

// Delete a VM or container on a host
router.delete('/hosts/:id/vms/:name', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.deleteInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(204).end();
    });
  });
});

// Start an instance
router.post('/hosts/:id/vms/:name/start', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.startInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json(result);
    });
  });
});

// Stop an instance
router.post('/hosts/:id/vms/:name/stop', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.stopInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json(result);
    });
  });
});

// Restart an instance
router.post('/hosts/:id/vms/:name/restart', (req, res) => {
  hosts.getHost(req.params.id, (err, host) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!host) return res.status(404).json({ error: 'Host not found' });
    instance.restartInstance(host, req.params.name, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json(result);
    });
  });
});

// WebSocket console endpoint (placeholder for HTTP, real WS handled in index.js)
router.get('/hosts/:id/vms/:name/console', (req, res) => {
  res.status(426).json({ error: 'Please connect via WebSocket.' });
});

module.exports = router;
