const speakeasy = require("speakeasy");
const { prisma } = require("../handlers/prisma");

async function verify2FA(userId, token) {
  try {
    const user = await prisma.user.findFirst({
      where: { 
        id: userId, 
        twoFaEnabled: true 
      },
      select: {
        twoFaSecret: true,
        recoveryCodes: true
      }
    });

    if (!user) {
      return false;
    }

    // Check if token is a recovery code
    if (user.recoveryCodes) {
      try {
        const recoveryCodes = JSON.parse(user.recoveryCodes);
        const codeIndex = recoveryCodes.indexOf(token.toUpperCase());
        if (codeIndex !== -1) {
          // Remove used recovery code
          recoveryCodes.splice(codeIndex, 1);
          const updatedCodes = JSON.stringify(recoveryCodes);
          
          await prisma.user.update({
            where: { id: userId },
            data: { recoveryCodes: updatedCodes }
          });
          
          return true;
        }
      } catch (parseErr) {
        console.error('Failed to parse recovery codes:', parseErr);
      }
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    return verified;
  } catch (err) {
    console.error('2FA verification error:', err);
    return false;
  }
}

module.exports = { verify2FA };
