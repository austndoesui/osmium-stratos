const fs = require('fs');
const path = require('path');
const toml = require('toml');

const configPath = path.join(__dirname, '..', 'config.toml');
const configFile = fs.readFileSync(configPath, 'utf-8');
const config = toml.parse(configFile);

// config.mode can be 'development' or 'production' as set in config.toml

module.exports = config;
