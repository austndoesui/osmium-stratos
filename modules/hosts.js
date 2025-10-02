const { prisma } = require('../handlers/prisma');
const https = require('https');
const { copyImageToHost: imageCopyImageToHost } = require('./image');

// List all LXD hosts from the database
async function listHosts(callback) {
  try {
    const hosts = await prisma.host.findMany({
      orderBy: { createdAt: 'desc' }
    });
    callback(null, hosts);
  } catch (error) {
    callback(error);
  }
}

// Get a single LXD host by ID
async function getHost(id, callback) {
  try {
    const host = await prisma.host.findUnique({
      where: { id: parseInt(id) }
    });
    callback(null, host);
  } catch (error) {
    callback(error);
  }
}

// Add a new LXD host to the database
async function addHost({ name, address, description, cert, key, ca }, callback) {
  try {
    const host = await prisma.host.create({
      data: {
        name,
        address,
        description,
        cert,
        key,
        ca
      }
    });
    callback(null, { id: host.id });
  } catch (error) {
    callback(error);
  }
}

// Delete a host from the database by ID
async function deleteHost(id, callback) {
  try {
    await prisma.host.delete({
      where: { id: parseInt(id) }
    });
    callback(null);
  } catch (error) {
    callback(error);
  }
}

// Poll an LXD operation until it completes (success or error)
function pollLXDOperation(host, operationUrl, callback) {
  const url = new URL(host.address);
  const opPath = new URL(operationUrl, host.address).pathname + '/wait?timeout=30';
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: opPath,
    method: 'GET',
    cert: host.cert,
    key: host.key,
    ca: host.ca || undefined,
    rejectUnauthorized: false,
    timeout: 35000,
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed && parsed.metadata && parsed.metadata.status === 'Success') {
          callback(null, parsed);
        } else {
          callback(new Error(parsed.metadata && parsed.metadata.err ? parsed.metadata.err : 'LXD operation failed'));
        }
      } catch (e) {
        callback(new Error('Failed to parse LXD operation response'));
      }
    });
  });
  req.on('error', (err) => callback(err));
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Operation polling timed out'));
  });
  req.end();
}

// Copy/import an image to a host (calls image.js logic and polls operation)
function copyImageToHost(host, imageAlias, callback) {
  imageCopyImageToHost(host, imageAlias, (err, result) => {
    if (err) return callback(err);
    pollLXDOperation(host, result.resp.operation, (err, opResult) => {
      if (err) return callback(err);
      callback(null, { name: result.name, opResult });
    });
  });
}

module.exports = {
  listHosts,         // List all hosts
  getHost,           // Get a single host
  addHost,           // Add a new host
  deleteHost,        // Delete a host
  pollLXDOperation,  // Poll an LXD operation
  copyImageToHost,   // Copy/import an image to a host
};
