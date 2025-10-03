const { prisma } = require("../handlers/prisma");
const bcrypt = require("bcrypt");

// Update username and email for a user
async function updateProfile(userId, username, email) {
  if (!username || !email) {
    throw { status: 400, message: "Username and email are required." };
  }
  // Check for username/email conflicts
  const conflict = await prisma.user.findFirst({
    where: {
      OR: [{ username: username }, { email: email }],
      NOT: { id: userId },
    },
  });
  if (conflict) {
    throw { status: 409, message: "Username or email already exists." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { username, email },
  });
  return true;
}

// Change password for a user
async function changePassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw { status: 400, message: "Current and new password are required." };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) {
    throw { status: 404, message: "User not found." };
  }
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    throw { status: 401, message: "Current password is incorrect." };
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });
  return true;
}

module.exports = { updateProfile, changePassword };
