const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../handlers/db');
const config = require('../handlers/config');

const JWT_SECRET = config.session.secret || 'replace-this-with-a-long-random-secret-key';

function setupAuth(router) {
  router.post('/login', (req, res) => {
    const { username, password, password_hash } = req.body;
    if (!username || (!password && !password_hash)) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!user) return res.status(401).json({ error: 'Invalid username or password.' });
      let match = false;
      if (password) {
        match = await bcrypt.compare(password, user.password_hash);
      } else if (password_hash) {
        match = password_hash === user.password_hash;
      }
      if (!match) return res.status(401).json({ error: 'Invalid username or password.' });
      const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '10m' });
      res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    });
  });

  router.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = auth.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      req.user = decoded;
      next();
    });
  };

  router.get('/me', router.ensureAuthenticated, (req, res) => {
    res.json({ authenticated: true, user: req.user });
  });

  router.get('/protected', router.ensureAuthenticated, (req, res) => {
    res.json({ message: 'You are authenticated!', user: req.user });
  });
}

module.exports = { setupAuth };
