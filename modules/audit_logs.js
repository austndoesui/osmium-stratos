const { prisma } = require("../handlers/prisma");

function addAuditLog({
  user_id,
  username,
  action,
  instance_id,
  instance_name,
  host_id,
  details,
}) {
  let detailsStr = null;
  if (details) {
    try {
      detailsStr =
        typeof details === "string" ? details : JSON.stringify(details);
    } catch (e) {
      console.error("[AuditLogs] Error stringifying details:", e);
      detailsStr = String(details);
    }
  }
  return prisma.auditLog
    .create({
      data: {
        userId: user_id || null,
        username: username || null,
        action,
        instanceId: instance_id || null,
        instanceName: instance_name || null,
        hostId: host_id || null,
        details: detailsStr,
      },
    })
    .then((result) => ({ id: result.id }));
}

function getAuditLogsForInstance(instance_id) {
  return prisma.auditLog.findMany({
    where: { instanceId: instance_id },
    orderBy: { createdAt: "desc" },
  });
}

module.exports = {
  addAuditLog,
  getAuditLogsForInstance,
};
