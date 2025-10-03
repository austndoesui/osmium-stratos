const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const config = require("./handlers/config");

const dbPath = path.join(__dirname, config.database.name);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  // Add 2FA columns to users table if they don't exist
  db.all(`PRAGMA table_info(users)`, (err, rows) => {
    if (err) {
      console.error("Error checking users table schema:", err.message);
      process.exit(1);
    }
    const columns = rows.map((row) => row.name);
    if (!columns.includes("two_fa_enabled")) {
      db.run(
        `ALTER TABLE users ADD COLUMN two_fa_enabled INTEGER DEFAULT 0`,
        (err) => {
          if (err)
            console.error("Error adding two_fa_enabled column:", err.message);
          else console.log("Added two_fa_enabled column to users table.");
        },
      );
    }
    if (!columns.includes("two_fa_secret")) {
      db.run(`ALTER TABLE users ADD COLUMN two_fa_secret TEXT`, (err) => {
        if (err)
          console.error("Error adding two_fa_secret column:", err.message);
        else console.log("Added two_fa_secret column to users table.");
      });
    }
    if (!columns.includes("recovery_codes")) {
      db.run(`ALTER TABLE users ADD COLUMN recovery_codes TEXT`, (err) => {
        if (err)
          console.error("Error adding recovery_codes column:", err.message);
        else console.log("Added recovery_codes column to users table.");
      });
    }
  });

  // Existing settings table creation
  db.run(
    `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
    (err) => {
      if (err) {
        console.error("Error creating settings table:", err.message);
        process.exit(1);
      } else {
        console.log("settings table checked/created.");
        db.close();
      }
    },
  );
});
