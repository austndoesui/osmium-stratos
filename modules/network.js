const db = require('../handlers/db');
const hosts = require('./hosts');
const https = require('https');

function findFreePort(host_id, start = 20000, end = 30000) {
  return new Promise((resolve, reject) => {
    db.all('SELECT host_port FROM port_forwards WHERE host_id = ?', [host_id], (err, rows) => {
      if (err) return reject(err);
      const used = new Set(rows.map(r => r.host_port));
      const range = [];
      for (let p = start; p <= end; ++p) range.push(p);
      for (let i = range.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [range[i], range[j]] = [range[j], range[i]];
      }
      for (const port of range) {
        if (!used.has(port)) return resolve(port);
      }
      reject(new Error('No free ports available in range.'));
    });
  });
}

async function addPortForward({ host_id, instance_name, container_port, protocol = 'tcp' }) {
  return new Promise((resolve, reject) => {
    hosts.getHost(host_id, (err, host) => {
      if (err || !host) return reject(new Error('Host not found'));
      db.get('SELECT id FROM instances WHERE name = ? AND host_id = ?', [instance_name, host_id], async (err, inst) => {
        if (err || !inst) return reject(new Error('Instance not found'));
        try {
          const host_ip = new URL(host.address).hostname;
          const host_port = await findFreePort(host_id);
          const device_name = `proxy-${container_port}-${host_port}`;
          const url = new URL(host.address);
          const deviceConfig = {
            [device_name]: {
              type: 'proxy',
              listen: `${protocol}:${host_ip}:${host_port}`,
              connect: `${protocol}:127.0.0.1:${container_port}`
            }
          };
          const patchData = JSON.stringify({ devices: deviceConfig });
          const options = {
            hostname: url.hostname,
            port: url.port,
            path: `/1.0/instances/${encodeURIComponent(instance_name)}`,
            method: 'PATCH',
            cert: host.cert,
            key: host.key,
            ca: host.ca || undefined,
            rejectUnauthorized: false,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(patchData),
            },
            timeout: 20000,
          };
          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              if (res.statusCode === 202 || res.statusCode === 200) {
                db.run(`INSERT INTO port_forwards (instance_id, host_id, device_name, host_ip, host_port, container_port, protocol) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [inst.id, host_id, device_name, host_ip, host_port, container_port, protocol],
                  function (dbErr) {
                    if (dbErr) return reject(dbErr);
                    resolve({ id: this.lastID, host_ip, host_port, container_port, protocol });
                  }
                );
              } else {
                reject(new Error('Failed to add LXD proxy device: ' + data));
              }
            });
          });
          req.on('error', (err) => reject(err));
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('LXD request timed out'));
          });
          req.write(patchData);
          req.end();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
}

function removePortForward({ id, host_id, instance_name }) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM port_forwards WHERE id = ?', [id], (err, pf) => {
      if (err || !pf) return reject(new Error('Port forward not found'));
      db.get('SELECT name FROM instances WHERE id = ?', [pf.instance_id], (err, inst) => {
        if (err || !inst) return reject(new Error('Instance not found for port forward'));
        hosts.getHost(host_id, (err, host) => {
          if (err || !host) return reject(new Error('Host not found'));
          const url = new URL(host.address);
          const options = {
            hostname: url.hostname,
            port: url.port,
            path: `/1.0/instances/${encodeURIComponent(inst.name)}/devices/${encodeURIComponent(pf.device_name)}`,
            method: 'DELETE',
            cert: host.cert,
            key: host.key,
            ca: host.ca || undefined,
            rejectUnauthorized: false,
            timeout: 20000,
          };
          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              if (
                res.statusCode === 202 ||
                res.statusCode === 200 ||
                res.statusCode === 204 ||
                res.statusCode === 404
              ) {
                db.run('DELETE FROM port_forwards WHERE id = ?', [id], (dbErr) => {
                  if (dbErr) {
                    console.error('[removePortForward] Failed to delete DB entry:', dbErr);
                    return reject(dbErr);
                  }
                  resolve({ success: true });
                });
              } else {
                console.error('[removePortForward] Failed to remove LXD proxy device:', data);
                reject(new Error('Failed to remove LXD proxy device: ' + data));
              }
            });
          });
          req.on('error', (err) => reject(err));
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('LXD request timed out'));
          });
          req.end();
        });
      });
    });
  });
}

function listPortForwards({ host_id, instance_name }, callback) {
  db.get('SELECT id FROM instances WHERE name = ? AND host_id = ?', [instance_name, host_id], (err, inst) => {
    if (err || !inst) return callback(err || new Error('Instance not found'));
    db.all('SELECT * FROM port_forwards WHERE instance_id = ?', [inst.id], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows.map(r => ({
        id: r.id,
        host_ip: r.host_ip,
        host_port: r.host_port,
        vm_port: r.container_port,
        protocol: r.protocol,
      })));
    });
  });
}

module.exports = {
  findFreePort,
  addPortForward,
  removePortForward,
  listPortForwards,
};
