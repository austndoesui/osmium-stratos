const db = require('../handlers/db');
const https = require('https');

// Get the list of available images from the database
function getImages(callback) {
  db.all('SELECT * FROM images', [], callback);
}

// Add a new image to the database
function addImage({ label, value }, callback) {
  db.run('INSERT INTO images (label, value) VALUES (?, ?)', [label, value], function (err) {
    callback(err, { id: this?.lastID });
  });
}

// Delete an image from the database by id
function deleteImage(id, callback) {
  db.run('DELETE FROM images WHERE id = ?', [id], callback);
}

// Parse an image alias into a source object for LXD API
function parseImageSource(imageAlias) {
  if (imageAlias.startsWith('images:')) {
    return {
      server: 'https://images.lxd.canonical.com',
      alias: imageAlias.split(':').slice(1).join(':'),
      protocol: 'simplestreams',
    };
  } else if (imageAlias.startsWith('ubuntu:')) {
    return {
      server: 'https://cloud-images.ubuntu.com/releases',
      alias: imageAlias.split(':')[1],
      protocol: 'simplestreams',
    };
  } else {
    // Not a supported image alias
    return {
      server: '',
      alias: imageAlias,
      protocol: 'simplestreams',
    };
  }
}

// Copy/import an image to a host by launching a minimal container
// Note: The caller (hosts.js) is responsible for polling the LXD operation to completion.
function copyImageToHost(host, imageAlias, callback) {
  const url = new URL(host.address);
  const containerName = `image-initialization-${Math.floor(Math.random() * 10000)}`;
  const src = parseImageSource(imageAlias);
  const postData = JSON.stringify({
    name: containerName,
    architecture: 'x86_64',
    type: 'container',
    source: {
      type: 'image',
      mode: 'pull',
      server: src.server,
      protocol: src.protocol,
      alias: src.alias,
    },
    config: {
      'limits.cpu': '1',
      'limits.memory': '128MB',
    },
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
        // Operation polling is handled by the caller (hosts.js)
        callback(null, { name: containerName, resp });
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
  getImages,
  addImage,
  deleteImage,
  parseImageSource,
  copyImageToHost,
};
