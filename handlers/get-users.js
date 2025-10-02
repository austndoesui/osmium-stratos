const { prisma } = require('./prisma');

async function getAllUsers(callback) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });
    callback(null, users);
  } catch (err) {
    callback(err);
  }
}

async function deleteUserById(id, callback) {
  try {
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    callback(null, { success: true, changes: 1 });
  } catch (err) {
    callback(err);
  }
}

module.exports = { getAllUsers, deleteUserById };
