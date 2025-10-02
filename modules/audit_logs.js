const db = require('../handlers/db');

function addAuditLog({ user_id, username, action, instance_id, instance_name, host_id, details }) {
  let detailsStr = null;
  if (details) {
    try {
      detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    } catch (e) {
      console.error('[AuditLogs] Error stringifying details:', e);
      detailsStr = String(details);
    }
  }
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO audit_logs (user_id, username, action, instance_id, instance_name, host_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id || null, username || null, action, instance_id || null, instance_name || null, host_id || null, detailsStr],
      function (err) {
        if (err) {
          console.error('[AuditLogs] Error adding log:', err);
          return reject(err);
        }
        resolve({ id: this.lastID });
      }
    );
  });
}

function getAuditLogsForInstance(instance_id) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM audit_logs WHERE instance_id = ? ORDER BY timestamp DESC',
      [instance_id],
      (err, rows) => {
        if (err) {
          console.error('[AuditLogs] Error:', err);
          return reject(err);
        }
        resolve(rows);
      }
    );
  });
}

module.exports = {
  addAuditLog,
  getAuditLogsForInstance,
};
