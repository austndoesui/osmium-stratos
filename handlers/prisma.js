const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Initialize the database connection
async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
async function closeDatabase() {
  await prisma.$disconnect();
}

// Handle shutdown
process.on('beforeExit', closeDatabase);
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);

module.exports = { prisma, initializeDatabase, closeDatabase };