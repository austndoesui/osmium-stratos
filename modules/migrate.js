const { prisma } = require("../handlers/prisma");
const hosts = require("./hosts");
const instance = require("./instance");

async function migrateInstance({ sourceHostId, targetHostId, instanceName }) {
  const dbInstance = await prisma.instance.findFirst({
    where: { hostId: sourceHostId, lxd_name: instanceName },
  });
  if (!dbInstance) return reject(new Error("Instance not found in DB"));
  const sourceHost = await new Promise((resolve, reject) => {
    hosts.getHost(sourceHostId, (err, host) => {
      if (err || !host) return reject(new Error("Source host not found"));
      resolve(host);
    });
  });
  const targetHost = await new Promise((resolve, reject) => {
    hosts.getHost(targetHostId, (err, host) => {
      if (err || !host) return reject(new Error("Target host not found"));
      resolve(host);
    });
  });
  await new Promise((resolve, reject) => {
    instance.stopInstance(sourceHost, instanceName, (err) => {
      if (err)
        return reject(
          new Error("Failed to stop instance on source host: " + err.message),
        );
      resolve();
    });
  });
  const config = await new Promise((resolve, reject) => {
    instance.getInstanceConfig(sourceHost, instanceName, (err, c) => {
      if (err)
        return reject(
          new Error("Failed to get instance config: " + err.message),
        );
      resolve(c);
    });
  });
  await new Promise((resolve, reject) => {
    instance.createVM(
      targetHost,
      {
        name: dbInstance.name,
        imageAlias: dbInstance.image_alias || config.image,
        type: config.type || "container",
        cpu: dbInstance.cpu || config.cpu,
        ram: dbInstance.ram || config.ram,
        disk: dbInstance.disk || config.disk,
      },
      (err) => {
        if (err)
          return reject(
            new Error(
              "Failed to create instance on target host: " + err.message,
            ),
          );
        resolve();
      },
    );
  });
  await new Promise((resolve, reject) => {
    instance.deleteInstance(sourceHost, instanceName, (err) => {
      if (err)
        return reject(
          new Error(
            "Failed to delete instance from source host: " + err.message,
          ),
        );
      resolve();
    });
  });
  await prisma.instance.update({
    where: { id: dbInstance.id },
    data: { hostId: targetHostId },
  });
  resolve({ success: true });
}

module.exports = { migrateInstance };
