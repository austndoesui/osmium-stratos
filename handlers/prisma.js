const { PrismaClient } = require('@prisma/client');

// Configure logging based on environment
const logConfig = process.env.NODE_ENV === 'production' 
  ? [
      {
        emit: 'stdout',
        level: 'error',
      },
      {
        emit: 'stdout', 
        level: 'warn',
      },
    ]
  : [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'stdout',
        level: 'error',
      },
      {
        emit: 'stdout',
        level: 'warn',
      },
    ];

const prisma = new PrismaClient({
  log: logConfig,
});

// Custom query logging with cleaner format (only in development)
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    const operation = e.query.split(' ')[0].toUpperCase();
    const table = extractTableName(e.query);
    const duration = e.duration;
    
    // Only log important operations or slow queries
    if (duration > 100 || ['INSERT', 'UPDATE', 'DELETE'].includes(operation)) {
      const emoji = operation === 'SELECT' ? '📖' : operation === 'INSERT' ? '➕' : operation === 'UPDATE' ? '✏️' : operation === 'DELETE' ? '🗑️' : '🗄️';
      console.log(`${emoji} ${operation} ${table} ${duration > 100 ? `(${duration}ms)` : ''}`);
    }
  });
}

// Extract table name from SQL query
function extractTableName(query) {
  const match = query.match(/(?:FROM|INTO|UPDATE)\s+"?(\w+)"?\."?(\w+)"?/i);
  return match ? match[2] : 'database';
}

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