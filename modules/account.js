const db = require('../handlers/db');
const bcrypt = require('bcrypt');

// Update username and email for a user
async function updateProfile(userId, username, email) {
  if (!username || !email) {
    throw { status: 400, message: 'Username and email are required.' };
  }
  // Check for username/email conflicts
  const conflict = await new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?', [username, email, userId], (err, row) => {
      if (err) return reject({ status: 500, message: 'Database error.' });
      resolve(row);
    });
  });
  if (conflict) {
    throw { status: 409, message: 'Username or email already in use.' };
  }
  await new Promise((resolve, reject) => {
    db.run('UPDATE users SET username = ?, email = ? WHERE id = ?', [username, email, userId], function (err) {
      if (err) return reject({ status: 500, message: 'Database error.' });
      resolve();
    });
  });
  return true;
}

// Change password for a user
async function changePassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw { status: 400, message: 'Current and new password are required.' };
  }
  const row = await new Promise((resolve, reject) => {
    db.get('SELECT password_hash FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) return reject({ status: 500, message: 'Database error.' });
      if (!row) return reject({ status: 404, message: 'User not found.' });
      resolve(row);
    });
  });
  const match = await bcrypt.compare(currentPassword, row.password_hash);
  if (!match) {
    throw { status: 401, message: 'Current password is incorrect.' };
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await new Promise((resolve, reject) => {
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId], function (err) {
      if (err) return reject({ status: 500, message: 'Database error.' });
      resolve();
    });
  });
  return true;
}

module.exports = { updateProfile, changePassword };
