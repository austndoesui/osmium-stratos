const fs = require('fs');
const path = require('path');
const toml = require('toml');

const configPath = path.join(__dirname, '..', 'config.toml');
const configFile = fs.readFileSync(configPath, 'utf-8');
const config = toml.parse(configFile);

module.exports = config;
