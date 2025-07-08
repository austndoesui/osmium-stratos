const https = require('https');
const { parseImageSource } = require('./image');

// Create a new VM or container on a given host
function createVM(host, { name, imageAlias, type, cpu, ram, disk }, callback) {
  const url = new URL(host.address);

  // Step 1: Check if instance with the same name exists
  const checkOptions = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(name)}`,
    method: 'GET',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    timeout: 10000,
  };
  const checkReq = https.request(checkOptions, (checkRes) => {
    let checkData = '';
    checkRes.on('data', (chunk) => { checkData += chunk; });
    checkRes.on('end', () => {
      if (checkRes.statusCode === 200) {
        // Instance already exists
        return callback(new Error('An instance with this name already exists.'));
      } else if (checkRes.statusCode === 404) {
        // Instance does not exist, proceed
        createInstance();
      } else {
        console.error('Error checking instance existence:', checkRes.statusCode, checkData);
        return callback(new Error('Failed to check instance existence: ' + checkData));
      }
    });
  });
  checkReq.on('error', (err) => {
    console.error('Error checking instance existence:', err);
    callback(new Error('Failed to check instance existence: ' + err.message));
  });
  checkReq.on('timeout', () => {
    checkReq.destroy();
    console.error('Timeout checking instance existence');
    callback(new Error('Timeout checking instance existence'));
  });
  checkReq.end();

  // Step 2: Create instance and poll operation
  function createInstance() {
    const src = parseImageSource(imageAlias);
    const isVM = (type === 'virtual-machine');
    const instanceConfig = {};
    if (isVM) {
      if (cpu) instanceConfig["limits.cpu"] = String(cpu);
      if (ram) instanceConfig["limits.memory"] = String(ram);
    }
    const devices = {};
    if (disk) {
      devices.root = {
        type: 'disk',
        path: '/',
        pool: 'default', // You may want to make this configurable
        size: String(disk)
      };
    }
    const postData = JSON.stringify({
      name,
      architecture: 'x86_4',
      type: type || 'virtual-machine',
      source: {
        type: 'image',
        alias: src.alias,
        mode: 'pull',
        server: src.server,
        protocol: src.protocol,
      },
      config: instanceConfig,
      ...(Object.keys(devices).length > 0 ? { devices } : {}),
    });
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: '/1.0/instances',
      method: 'POST',
      cert: host.cert,
      key: host.key,
      ca: host.ca || undefined,
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 20000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 202 || res.statusCode === 200) {
          const resp = JSON.parse(data);
          let opId = null;
          if (resp.operation) {
            // resp.operation is like "/1.0/operations/<op-id>"
            const match = resp.operation.match(/\/operations\/(.+)$/);
            if (match) opId = match[1];
          }
          if (!opId) {
            return callback(new Error('No valid operation ID returned by LXD.'));
          }
          // Poll the operation endpoint
          pollOperation(opId, 0, function pollCb(err, opResp) {
            if (err) return callback(err);
            // After successful creation, always set limits.memory and limits.cpu if provided
            if (cpu || ram) {
              const patchConfig = {};
              if (cpu) patchConfig["limits.cpu"] = String(cpu);
              if (ram) patchConfig["limits.memory"] = String(ram);
              const patchData = JSON.stringify({ config: patchConfig });
              const patchOptions = {
                hostname: url.hostname,
                port: url.port,
                path: `/1.0/instances/${encodeURIComponent(name)}`,
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
              const patchReq = https.request(patchOptions, (patchRes) => {
                let patchResData = '';
                patchRes.on('data', (chunk) => { patchResData += chunk; });
                patchRes.on('end', () => {
                  if (patchRes.statusCode !== 200) {
                    console.error('Failed to set instance limits after creation:', patchRes.statusCode, patchResData);
                  }
                  // Always call the main callback with the original opResp
                  return callback(null, opResp);
                });
              });
              patchReq.on('error', (err) => {
                console.error('Error setting instance limits after creation:', err);
                return callback(null, opResp); // Still succeed
              });
              patchReq.on('timeout', () => {
                patchReq.destroy();
                console.error('Timeout setting instance limits after creation');
                return callback(null, opResp); // Still succeed
              });
              patchReq.write(patchData);
              patchReq.end();
            } else {
              // No limits to set, just callback
              return callback(null, opResp);
            }
          });
        } else {
          console.error('LXD API error:', res.statusCode, data);
          callback(new Error('LXD API error: ' + data));
        }
      });
    });
    req.on('error', (err) => {
      console.error('LXD API request error:', err);
      callback(err);
    });
    req.on('timeout', () => {
      req.destroy();
      console.error('LXD API request timed out');
      callback(new Error('Connection timed out'));
    });
    req.write(postData);
    req.end();
  }

  // Step 3: Poll operation endpoint
  function pollOperation(opIdOrUrl, attempt, cb) {
    const maxAttempts = 30; // ~30 seconds
    const pollInterval = 1000; // 1 second
    let opId = opIdOrUrl;
    if (opId.startsWith('/')) {
      opId = opId.split('/').pop();
    }
    const pollOptions = {
      hostname: url.hostname,
      port: url.port,
      path: `/1.0/operations/${opId}/wait?timeout=5`,
      method: 'GET',
      cert: host.cert,
      key: host.key,
      ca: host.ca || undefined,
      rejectUnauthorized: false,
      timeout: 7000,
    };
    const pollReq = https.request(pollOptions, (pollRes) => {
      let pollData = '';
      pollRes.on('data', (chunk) => { pollData += chunk; });
      pollRes.on('end', () => {
        if (pollRes.statusCode === 200) {
          try {
            const opResp = JSON.parse(pollData);
            if (opResp.metadata && opResp.metadata.status === 'Success') {
              return cb(null, opResp);
            } else if (opResp.metadata && opResp.metadata.status === 'Failure') {
              return cb(new Error('LXD operation failed: ' + (opResp.metadata.err || 'Unknown error')));
            } else if (attempt < maxAttempts) {
              setTimeout(() => pollOperation(opIdOrUrl, attempt + 1, cb), pollInterval);
            } else {
              return cb(new Error('LXD operation timed out.'));
            }
          } catch (e) {
            return cb(new Error('Failed to parse LXD operation response: ' + e.message));
          }
        } else {
          return cb(new Error('Failed to poll LXD operation: ' + pollData));
        }
      });
    });
    pollReq.on('error', (err) => {
      console.error('Error polling LXD operation:', err);
      cb(new Error('Error polling LXD operation: ' + err.message));
    });
    pollReq.on('timeout', () => {
      pollReq.destroy();
      cb(new Error('Timeout polling LXD operation'));
    });
    pollReq.end();
  }
}

// List all VMs/containers on a given host
function listVMsOnHost(host, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: '/1.0/instances?recursion=1',
    method: 'GET',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    timeout: 10000,
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          // Add image info to each instance
          const instances = (parsed.metadata || []).map(vm => {
            let image = null;
            if (vm.config) {
              image = vm.config['volatile.base_image'] || vm.config['image.alias'] || null;
            }
            return { ...vm, image };
          });
          callback(null, instances);
        } catch (e) {
          callback(new Error('Failed to parse LXD response'));
        }
      } else {
        callback(new Error('LXD API error: ' + data));
      }
    });
  });
  req.on('error', (err) => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Connection timed out'));
  });
  req.end();
}

// Delete a VM or container on a given host
function deleteInstance(host, name, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(name)}`,
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
      if (res.statusCode === 202 || res.statusCode === 200) {
        callback(null, JSON.parse(data));
      } else {
        callback(new Error('LXD API error: ' + data));
      }
    });
  });
  req.on('error', (err) => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Connection timed out'));
  });
  req.end();
}

// Start a VM or container on a given host
function startInstance(host, name, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(name)}/state`,
    method: 'PUT',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000,
  };
  const postData = JSON.stringify({ action: 'start', timeout: 30, force: true });
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 202 || res.statusCode === 200) {
        callback(null, JSON.parse(data));
      } else {
        callback(new Error('LXD API error: ' + data));
      }
    });
  });
  req.on('error', (err) => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Connection timed out'));
  });
  req.write(postData);
  req.end();
}

// Stop a VM or container on a given host
function stopInstance(host, name, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(name)}/state`,
    method: 'PUT',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000,
  };
  const postData = JSON.stringify({ action: 'stop', timeout: 30, force: true });
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 202 || res.statusCode === 200) {
        callback(null, JSON.parse(data));
      } else {
        callback(new Error('LXD API error: ' + data));
      }
    });
  });
  req.on('error', (err) => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Connection timed out'));
  });
  req.write(postData);
  req.end();
}

// Restart a VM or container on a given host
function restartInstance(host, name, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(name)}/state`,
    method: 'PUT',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000,
  };
  const postData = JSON.stringify({ action: 'restart', timeout: 30, force: true });
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 202 || res.statusCode === 200) {
        callback(null, JSON.parse(data));
      } else {
        callback(new Error('LXD API error: ' + data));
      }
    });
  });
  req.on('error', (err) => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Connection timed out'));
  });
  req.write(postData);
  req.end();
}

// Fetch resource usage for a given instance on a host
function getInstanceUsage(host, name, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(name)}/state`,
    method: 'GET',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    timeout: 10000,
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          const meta = parsed.metadata || {};
          callback(null, {
            cpu: meta.cpu ? meta.cpu.usage : null,
            memory: meta.memory ? { usage: meta.memory.usage, usage_peak: meta.memory.usage_peak } : null,
            disk: meta.disk ? meta.disk : null,
            network: meta.network ? meta.network : null,
            raw: meta // for debugging/future use
          });
        } catch (e) {
          console.error('Failed to parse response:', e, data);
          callback(new Error('Failed to parse LXD state response'));
        }
      } else {
        console.error('LXD API error:', res.statusCode, data);
        callback(new Error('LXD API error: ' + data));
      }
    });
  });
  req.on('error', (err) => {
    console.error('Request error:', err);
    callback(err);
  });
  req.on('timeout', () => {
    req.destroy();
    console.error('Request timed out');
    callback(new Error('Connection timed out'));
  });
  req.end();
}

// Resize a VM or container on a given host
function resizeInstance(host, name, { cpu, ram, disk }, callback) {
  // Step 1: PATCH config for cpu/ram
  const patchConfig = {};
  if (cpu) patchConfig["limits.cpu"] = String(cpu);
  if (ram) patchConfig["limits.memory"] = String(ram);
  const patchData = JSON.stringify({ config: patchConfig });
  const patchOptions = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(name)}`,
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
  const patchReq = https.request(patchOptions, (patchRes) => {
    let patchResData = '';
    patchRes.on('data', (chunk) => { patchResData += chunk; });
    patchRes.on('end', () => {
      if (patchRes.statusCode !== 200) {
        return callback(new Error('Failed to set instance limits: ' + patchResData));
      }
      // Step 2: Update disk size if provided
      if (disk) {
        // PATCH the root disk device
        const diskData = JSON.stringify({
          devices: {
            root: {
              type: 'disk',
              path: '/',
              pool: 'default',
              size: String(disk)
            }
          }
        });
        const diskOptions = {
          hostname: url.hostname,
          port: url.port,
          path: `/1.0/instances/${encodeURIComponent(name)}`,
          method: 'PATCH',
          cert: host.cert,
          key: host.key,
          ca: host.ca || undefined,
          rejectUnauthorized: false,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(diskData),
          },
          timeout: 20000,
        };
        const diskReq = https.request(diskOptions, (diskRes) => {
          let diskResData = '';
          diskRes.on('data', (chunk) => { diskResData += chunk; });
          diskRes.on('end', () => {
            if (diskRes.statusCode !== 200) {
              return callback(new Error('Failed to set disk size: ' + diskResData));
            }
            return callback(null, { success: true });
          });
        });
        diskReq.on('error', (err) => callback(new Error('Error setting disk size: ' + err.message)));
        diskReq.on('timeout', () => {
          diskReq.destroy();
          callback(new Error('Timeout setting disk size'));
        });
        diskReq.write(diskData);
        diskReq.end();
      } else {
        return callback(null, { success: true });
      }
    });
  });
  patchReq.on('error', (err) => callback(new Error('Error setting instance limits: ' + err.message)));
  patchReq.on('timeout', () => {
    patchReq.destroy();
    callback(new Error('Timeout setting instance limits'));
  });
  patchReq.write(patchData);
  patchReq.end();
}

module.exports = {
  createVM,
  listVMsOnHost,
  deleteInstance,
  startInstance,
  stopInstance,
  restartInstance,
  getInstanceUsage,
  resizeInstance,
};
