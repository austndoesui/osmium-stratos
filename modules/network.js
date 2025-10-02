const { prisma } = require('../handlers/prisma');
const hosts = require('./hosts');
const https = require('https');

async function findFreePort(host_id, start = 20000, end = 30000) {
  try {
    const rows = await prisma.portForward.findMany({
      where: { hostId: host_id },
      select: { hostPort: true }
    });
    
    const used = new Set(rows.map(r => r.hostPort));
    const range = [];
    for (let p = start; p <= end; ++p) range.push(p);
    for (let i = range.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [range[i], range[j]] = [range[j], range[i]];
    }
    for (const port of range) {
      if (!used.has(port)) return port;
    }
    throw new Error('No free ports available in range.');
  } catch (error) {
    throw error;
  }
}

async function addPortForward({ host_id, instance_name, container_port, protocol = 'tcp' }) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get host (assuming hosts module will be updated too)
      hosts.getHost(host_id, async (err, host) => {
        if (err || !host) return reject(new Error('Host not found'));
        
        try {
          const instance = await prisma.instance.findFirst({
            where: { name: instance_name, hostId: host_id }
          });
          
          if (!instance) return reject(new Error('Instance not found'));
          
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
            res.on('end', async () => {
              if (res.statusCode === 202 || res.statusCode === 200) {
                try {
                  const portForward = await prisma.portForward.create({
                    data: {
                      instanceId: instance.id,
                      hostId: host_id,
                      deviceName: device_name,
                      hostIp: host_ip,
                      hostPort: host_port,
                      containerPort: container_port,
                      protocol: protocol
                    }
                  });
                  resolve({ id: portForward.id, host_ip, host_port, container_port, protocol });
                } catch (dbErr) {
                  reject(dbErr);
                }
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
    } catch (error) {
      reject(error);
    }
  });
}

async function removePortForward({ id, host_id, instance_name }) {
  return new Promise(async (resolve, reject) => {
    try {
      const pf = await prisma.portForward.findUnique({
        where: { id: parseInt(id) },
        include: { instance: true }
      });
      
      if (!pf) return reject(new Error('Port forward not found'));
      
      hosts.getHost(host_id, (err, host) => {
        if (err || !host) return reject(new Error('Host not found'));
        
        const url = new URL(host.address);
        const options = {
          hostname: url.hostname,
          port: url.port,
          path: `/1.0/instances/${encodeURIComponent(pf.instance.name)}/devices/${encodeURIComponent(pf.deviceName)}`,
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
          res.on('end', async () => {
            if (
              res.statusCode === 202 ||
              res.statusCode === 200 ||
              res.statusCode === 204 ||
              res.statusCode === 404
            ) {
              try {
                await prisma.portForward.delete({
                  where: { id: parseInt(id) }
                });
                resolve({ success: true });
              } catch (dbErr) {
                console.error('[removePortForward] Failed to delete DB entry:', dbErr);
                reject(dbErr);
              }
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
    } catch (error) {
      reject(error);
    }
  });
}

async function listPortForwards({ host_id, instance_name }, callback) {
  try {
    const instance = await prisma.instance.findFirst({
      where: { name: instance_name, hostId: host_id }
    });
    
    if (!instance) return callback(new Error('Instance not found'));
    
    const portForwards = await prisma.portForward.findMany({
      where: { instanceId: instance.id }
    });
    
    const result = portForwards.map(r => ({
      id: r.id,
      host_ip: r.hostIp,
      host_port: r.hostPort,
      vm_port: r.containerPort,
      protocol: r.protocol,
    }));
    
    callback(null, result);
  } catch (error) {
    callback(error);
  }
}

module.exports = {
  findFreePort,
  addPortForward,
  removePortForward,
  listPortForwards,
};

module.exports = {
  findFreePort,
  addPortForward,
  removePortForward,
  listPortForwards,
};
