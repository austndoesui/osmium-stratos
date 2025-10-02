const { prisma } = require('./prisma');

function getAllUsers(callback) {
  db.all(
    'SELECT id, username, email, role FROM users',
    [],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    }
  );
}

function deleteUserById(id, callback) {
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) return callback(err);
    callback(null, { success: true, changes: this.changes });
  });
}

module.exports = { getAllUsers, deleteUserById };
