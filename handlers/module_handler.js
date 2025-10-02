const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, '../modules');

function loadModules() {
  const modules = {};
  fs.readdirSync(modulesDir).forEach(file => {
    if (file.endsWith('.js')) {
      const name = path.basename(file, '.js');
      modules[name] = require(path.join(modulesDir, file));
    }
  });
  return modules;
}

const loadedModules = loadModules();

module.exports = loadedModules;
