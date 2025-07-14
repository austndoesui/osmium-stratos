const speakeasy = require('speakeasy');
const db = require('../handlers/db');

function verify2FA(userId, token) {
  return new Promise((resolve, reject) => {
    db.get('SELECT two_fa_secret, recovery_codes FROM users WHERE id = ? AND two_fa_enabled = 1', [userId], (err, user) => {
      if (err) {
        return reject(err);
      }
      if (!user) {
        return resolve(false);
      }
      if (user.recovery_codes) {
        const recoveryCodes = JSON.parse(user.recovery_codes);
        const codeIndex = recoveryCodes.indexOf(token.toUpperCase());
        if (codeIndex !== -1) {
          recoveryCodes.splice(codeIndex, 1);
          const updatedCodes = JSON.stringify(recoveryCodes);
          db.run('UPDATE users SET recovery_codes = ? WHERE id = ?', [updatedCodes, userId], (updateErr) => {
            if (updateErr) {
              console.error('Failed to update recovery codes:', updateErr);
            }
          });
          return resolve(true);
        }
      }
      const verified = speakeasy.totp.verify({
        secret: user.two_fa_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });
      resolve(verified);
    });
  });
}

module.exports = { verify2FA };