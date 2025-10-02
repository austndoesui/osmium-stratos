const { prisma } = require('../handlers/prisma');

async function getSetting(key) {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key }
    });
    return setting ? setting.value : null;
  } catch (error) {
    throw error;
  }
}

async function setSetting(key, value) {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  } catch (error) {
    throw error;
  }
}

async function getAllSettings() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    // Set defaults if not exists
    if (!settingsObj.panel_name) settingsObj.panel_name = 'Osmium';
    if (!settingsObj.footer_text) settingsObj.footer_text = '';
    
    return settingsObj;
  } catch (error) {
    throw error;
  }
}

module.exports = { getSetting, setSetting, getAllSettings };
