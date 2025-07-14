const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./handlers/config');

const dbPath = path.join(__dirname, '..', config.database.name);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
});

function addColumnIfNotExists(table, column, type, defaultValue, cb) {
  db.get(`PRAGMA table_info(${table})`, (err, info) => {
    if (err) return cb(err);
    db.all(`PRAGMA table_info(${table})`, (err, columns) => {
      if (err) return cb(err);
      const exists = columns.some(col => col.name === column);
      if (exists) return cb();
      const defaultClause = defaultValue !== undefined ? `DEFAULT ${defaultValue}` : '';
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} ${defaultClause}`.trim(), cb);
    });
  });
}

addColumnIfNotExists('users', 'two_fa_enabled', 'INTEGER', 0, (err) => {
  if (err) console.error('Error adding two_fa_enabled:', err.message);
  else console.log('two_fa_enabled column checked/added.');
  addColumnIfNotExists('users', 'two_fa_secret', 'TEXT', undefined, (err) => {
    if (err) console.error('Error adding two_fa_secret:', err.message);
    else console.log('two_fa_secret column checked/added.');
    addColumnIfNotExists('users', 'recovery_codes', 'TEXT', undefined, (err) => {
      if (err) console.error('Error adding recovery_codes:', err.message);
      else console.log('recovery_codes column checked/added.');
      // Add notifications table if not exists
      db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        message TEXT,
        type TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`, (err) => {
        if (err) console.error('Error creating notifications table:', err.message);
        else console.log('notifications table checked/created.');
        db.close();
      });
    });
  });
}); 