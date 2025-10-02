const { prisma } = require('../handlers/prisma');
const hosts = require('./hosts');
const instance = require('./instance');

async function migrateInstance({ sourceHostId, targetHostId, instanceName }) {
  return new Promise((resolve, reject) => {
    // 1. Get instance config from DB
    db.get('SELECT * FROM instances WHERE host_id = ? AND name = ?', [sourceHostId, instanceName], (err, dbInstance) => {
      if (err || !dbInstance) return reject(new Error('Instance not found in DB'));
      // 2. Get source and target host configs
      hosts.getHost(sourceHostId, (err, sourceHost) => {
        if (err || !sourceHost) return reject(new Error('Source host not found'));
        hosts.getHost(targetHostId, (err, targetHost) => {
          if (err || !targetHost) return reject(new Error('Target host not found'));
          // 3. Stop the instance on the source host
          instance.stopInstance(sourceHost, instanceName, (err) => {
            if (err) return reject(new Error('Failed to stop instance on source host: ' + err.message));
            // 4. Get instance config from source host (for image, resources, etc.)
            instance.getInstanceConfig(sourceHost, instanceName, (err, config) => {
              if (err) return reject(new Error('Failed to get instance config: ' + err.message));
              // 5. Create the instance on the target host
              instance.createVM(targetHost, {
                name: dbInstance.name,
                imageAlias: dbInstance.image_alias || config.image,
                type: config.type || 'container',
                cpu: dbInstance.cpu || config.cpu,
                ram: dbInstance.ram || config.ram,
                disk: dbInstance.disk || config.disk
              }, (err) => {
                if (err) return reject(new Error('Failed to create instance on target host: ' + err.message));
                // 6. Delete the instance from the source host
                instance.deleteInstance(sourceHost, instanceName, (err) => {
                  if (err) return reject(new Error('Failed to delete instance from source host: ' + err.message));
                  // 7. Update the DB to point to the new host
                  db.run('UPDATE instances SET host_id = ? WHERE id = ?', [targetHostId, dbInstance.id], (err) => {
                    if (err) return reject(new Error('Failed to update DB: ' + err.message));
                    resolve({ success: true });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

module.exports = { migrateInstance };
