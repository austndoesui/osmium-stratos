const https = require('https');
const { parseImageSource } = require('./image');

// Create a new VM or container on a given host
function createVM(host, { name, imageAlias, type }, callback) {
  console.log('createVM called with:', { host: host.address, name, imageAlias, type });
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
    const instanceConfig = isVM
      ? {
          "limits.cpu": "1",
          "limits.memory": "1GB"
        }
      : {};
    const postData = JSON.stringify({
      name,
      architecture: 'x86_64',
      type: type || 'virtual-machine',
      source: {
        type: 'image',
        alias: src.alias,
        mode: 'pull',
        server: src.server,
        protocol: src.protocol,
      },
      config: instanceConfig,
    });
    console.log('LXD API POST /1.0/instances payload:', postData);
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
          pollOperation(opId, 0, callback);
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
          callback(null, parsed.metadata || []);
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

module.exports = {
  createVM,
  listVMsOnHost,
  deleteInstance,
  startInstance,
  stopInstance,
  restartInstance,
};
