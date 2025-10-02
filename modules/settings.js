const db = require('../handlers/db');

function getSetting(key, cb) {
  db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
    if (err) return cb(err);
    cb(null, row ? row.value : null);
  });
}

function setSetting(key, value, cb) {
  db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
    cb
  );
}

function getAllSettings(cb) {
  db.all('SELECT key, value FROM settings', (err, rows) => {
    if (err) return cb(err);
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    if (!settings.panel_name) settings.panel_name = 'Osmium';
    if (!settings.footer_text) settings.footer_text = '';
    cb(null, settings);
  });
}

module.exports = { getSetting, setSetting, getAllSettings };
