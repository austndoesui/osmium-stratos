const { prisma } = require('../handlers/prisma');
const https = require('https');
const { copyImageToHost: imageCopyImageToHost } = require('./image');

// List all LXD hosts from the database
async function listHosts() {
  try {
    const hosts = await prisma.host.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return hosts;
  } catch (error) {
    throw error;
  }
}

// Get a single LXD host by ID
async function getHost(id) {
  try {
    const host = await prisma.host.findUnique({
      where: { id: parseInt(id) }
    });
    return host;
  } catch (error) {
    throw error;
  }
}

// Add a new LXD host to the database
async function addHost({ name, address, description, cert, key, ca }) {
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
    return { id: host.id };
  } catch (error) {
    throw error;
  }
}

// Delete a host from the database by ID
async function deleteHost(id) {
  try {
    await prisma.host.delete({
      where: { id: parseInt(id) }
    });
    return true;
  } catch (error) {
    throw error;
  }
}

// Poll an LXD operation until it completes (success or error)
function pollLXDOperation(host, operationUrl) {
  return new Promise((resolve, reject) => {
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
            resolve(parsed);
          } else {
            reject(new Error(parsed.metadata && parsed.metadata.err ? parsed.metadata.err : 'LXD operation failed'));
          }
        } catch (e) {
          reject(new Error('Failed to parse LXD operation response'));
        }
      });
    });
    
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Operation polling timed out'));
    });
    req.end();
  });
}

// Copy/import an image to a host (calls image.js logic and polls operation)
async function copyImageToHost(host, imageAlias) {
  try {
    const result = await new Promise((resolve, reject) => {
      imageCopyImageToHost(host, imageAlias, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    const opResult = await pollLXDOperation(host, result.resp.operation);
    return { name: result.name, opResult };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  listHosts,         // List all hosts
  getHost,           // Get a single host
  addHost,           // Add a new host
  deleteHost,        // Delete a host
  pollLXDOperation,  // Poll an LXD operation
  copyImageToHost,   // Copy/import an image to a host
};
