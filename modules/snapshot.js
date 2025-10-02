const https = require('https');
const { URL } = require('url');

function createSnapshot(host, instanceName, { name, stateful }, callback) {
  const url = new URL(host.address);
  const postData = JSON.stringify({
    name: name || undefined,
    stateful: !!stateful
  });
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(instanceName)}/snapshots`,
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
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 202 || res.statusCode === 200) {
        callback(null, JSON.parse(data));
      } else {
        callback(new Error('Failed to create snapshot: ' + data));
      }
    });
  });
  req.on('error', err => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Request timed out'));
  });
  req.write(postData);
  req.end();
}

function listSnapshots(host, instanceName, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(instanceName)}/snapshots?recursion=1`,
    method: 'GET',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    timeout: 10000,
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const parsed = JSON.parse(data);
        callback(null, parsed.metadata || []);
      } else {
        callback(new Error('Failed to list snapshots: ' + data));
      }
    });
  });
  req.on('error', err => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Request timed out'));
  });
  req.end();
}

function restoreSnapshot(host, instanceName, snapshotName, callback) {
  const url = new URL(host.address);
  const postData = JSON.stringify({ restore: snapshotName });
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(instanceName)}`,
    method: 'PUT', 
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
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 202 || res.statusCode === 200) {
        callback(null, JSON.parse(data));
      } else {
        callback(new Error('Failed to restore snapshot: ' + data));
      }
    });
  });
  req.on('error', err => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Request timed out'));
  });
  req.write(postData);
  req.end();
}

function deleteSnapshot(host, instanceName, snapshotName, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/1.0/instances/${encodeURIComponent(instanceName)}/snapshots/${encodeURIComponent(snapshotName)}`,
    method: 'DELETE',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    timeout: 20000,
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 202) {
       
        const resp = JSON.parse(data);
        const opUrl = resp.operation; 
        waitForLxdOperation(host, opUrl, callback);
      } else if (res.statusCode === 200 || res.statusCode === 204) {
        callback(null, { success: true });
      } else {
        callback(new Error('Failed to delete snapshot: ' + data));
      }
    });
  });
  req.on('error', err => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Request timed out'));
  });
  req.end();
}


function waitForLxdOperation(host, opUrl, callback) {
  const url = new URL(host.address);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `${opUrl}/wait?timeout=10`, 
    method: 'GET',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    timeout: 15000,
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const resp = JSON.parse(data);
        if (resp.metadata && resp.metadata.status === 'Success') {
          callback(null, { success: true });
        } else {
          callback(new Error('LXD operation failed: ' + (resp.metadata && resp.metadata.err)));
        }
      } else {
        callback(new Error('Failed to wait for LXD operation: ' + data));
      }
    });
  });
  req.on('error', err => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('LXD operation wait timed out'));
  });
  req.end();
}

module.exports = {
  createSnapshot,
  listSnapshots,
  restoreSnapshot,
  deleteSnapshot,
};
