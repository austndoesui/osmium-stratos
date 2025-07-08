const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'osmium.db');
const db = new sqlite3.Database(dbPath);

function addColumnIfNotExists(table, column, type) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, columns) => {
      if (err) return reject(err);
      if (!columns.some(col => col.name === column)) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
          if (err) return reject(err);
          console.log(`Added column ${column} to ${table}`);
          resolve();
        });
      } else {
        console.log(`Column ${column} already exists in ${table}`);
        resolve();
      }
    });
  });
}

function createTableIfNotExists(table, schema) {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS ${table} (${schema})`, (err) => {
      if (err) return reject(err);
      console.log(`Ensured table ${table} exists`);
      resolve();
    });
  });
}

(async () => {
  try {
    await addColumnIfNotExists('instances', 'cpu', 'INTEGER');
    await addColumnIfNotExists('instances', 'ram', 'INTEGER');
    await addColumnIfNotExists('instances', 'disk', 'INTEGER');
    await addColumnIfNotExists('instances', 'image_alias', 'TEXT');
    await createTableIfNotExists('port_forwards', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id INTEGER NOT NULL,
      host_id INTEGER NOT NULL,
      device_name TEXT NOT NULL,
      host_ip TEXT NOT NULL,
      host_port INTEGER NOT NULL,
      container_port INTEGER NOT NULL,
      protocol TEXT NOT NULL DEFAULT 'tcp',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instance_id) REFERENCES instances(id),
      FOREIGN KEY (host_id) REFERENCES host(id)
    `);
    db.close();
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    db.close();
    process.exit(1);
  }
})(); 