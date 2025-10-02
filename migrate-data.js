const { prisma } = require('./handlers/prisma');
const path = require('path');

// This script helps migrate data from SQLite to PostgreSQL
// Run this AFTER setting up your PostgreSQL database and running migrations

async function migrateData() {
  // Check if sqlite3 is available
  let sqlite3;
  try {
    sqlite3 = require('sqlite3').verbose();
  } catch (error) {
    console.log('❌ SQLite3 module not found. Installing it temporarily...');
    console.log('💡 Run: npm install sqlite3 --no-save');
    console.log('   Then run: npm run migrate-data');
    console.log('   After migration, you can uninstall: npm uninstall sqlite3');
    return;
  }

  // Check if SQLite database exists
  const sqliteDbPath = path.join(__dirname, 'osmium.db');
  const fs = require('fs');
  
  if (!fs.existsSync(sqliteDbPath)) {
    console.log('❌ SQLite database not found. Nothing to migrate.');
    console.log('💡 If you have an existing database, make sure it\'s named "osmium.db" in the project root.');
    return;
  }

  console.log('🔄 Starting data migration from SQLite to PostgreSQL...');
  
  const db = new sqlite3.Database(sqliteDbPath);
  
  try {
    // Migrate hosts
    await migrateTable(db, 'host', async (rows) => {
      for (const row of rows) {
        await prisma.host.create({
          data: {
            id: row.id,
            name: row.name,
            address: row.address,
            description: row.description,
            cert: row.cert,
            key: row.key,
            ca: row.ca,
            createdAt: row.created_at ? new Date(row.created_at) : new Date()
          }
        });
      }
      console.log(`✅ Migrated ${rows.length} hosts`);
    });

    // Migrate images
    await migrateTable(db, 'images', async (rows) => {
      for (const row of rows) {
        await prisma.image.create({
          data: {
            id: row.id,
            label: row.label,
            value: row.value
          }
        });
      }
      console.log(`✅ Migrated ${rows.length} images`);
    });

    // Migrate users
    await migrateTable(db, 'users', async (rows) => {
      for (const row of rows) {
        await prisma.user.create({
          data: {
            id: row.id,
            username: row.username,
            email: row.email,
            passwordHash: row.password_hash,
            role: row.role || 'user',
            twoFaEnabled: Boolean(row.two_fa_enabled),
            twoFaSecret: row.two_fa_secret,
            recoveryCodes: row.recovery_codes
          }
        });
      }
      console.log(`✅ Migrated ${rows.length} users`);
    });

    // Migrate instances
    await migrateTable(db, 'instances', async (rows) => {
      for (const row of rows) {
        await prisma.instance.create({
          data: {
            id: row.id,
            name: row.name,
            hostId: row.host_id,
            lxdName: row.lxd_name,
            userId: row.user_id,
            cpu: row.cpu,
            ram: row.ram,
            disk: row.disk,
            imageAlias: row.image_alias,
            createdAt: row.created_at ? new Date(row.created_at) : new Date()
          }
        });
      }
      console.log(`✅ Migrated ${rows.length} instances`);
    });

    // Migrate port_forwards
    await migrateTable(db, 'port_forwards', async (rows) => {
      for (const row of rows) {
        await prisma.portForward.create({
          data: {
            id: row.id,
            instanceId: row.instance_id,
            hostId: row.host_id,
            deviceName: row.device_name,
            hostIp: row.host_ip,
            hostPort: row.host_port,
            containerPort: row.container_port,
            protocol: row.protocol || 'tcp',
            createdAt: row.created_at ? new Date(row.created_at) : new Date()
          }
        });
      }
      console.log(`✅ Migrated ${rows.length} port forwards`);
    });

    // Migrate audit_logs
    await migrateTable(db, 'audit_logs', async (rows) => {
      for (const row of rows) {
        await prisma.auditLog.create({
          data: {
            id: row.id,
            userId: row.user_id,
            username: row.username,
            action: row.action,
            instanceId: row.instance_id,
            instanceName: row.instance_name,
            hostId: row.host_id,
            timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
            details: row.details
          }
        });
      }
      console.log(`✅ Migrated ${rows.length} audit logs`);
    });

    // Migrate notifications
    await migrateTable(db, 'notifications', async (rows) => {
      for (const row of rows) {
        await prisma.notification.create({
          data: {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            message: row.message,
            type: row.type,
            isRead: Boolean(row.is_read),
            createdAt: row.created_at ? new Date(row.created_at) : new Date()
          }
        });
      }
      console.log(`✅ Migrated ${rows.length} notifications`);
    });

    // Migrate settings
    await migrateTable(db, 'settings', async (rows) => {
      for (const row of rows) {
        await prisma.setting.create({
          data: {
            key: row.key,
            value: row.value
          }
        });
      }
      console.log(`✅ Migrated ${rows.length} settings`);
    });

    console.log('🎉 Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

function migrateTable(db, tableName, migrationFunction) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, [], async (err, rows) => {
      if (err) {
        console.error(`❌ Error reading ${tableName}:`, err);
        return reject(err);
      }
      
      try {
        await migrationFunction(rows);
        resolve();
      } catch (error) {
        console.error(`❌ Error migrating ${tableName}:`, error);
        reject(error);
      }
    });
  });
}

// Run migration if called directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('Migration completed. You can now remove the SQLite database file.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateData };