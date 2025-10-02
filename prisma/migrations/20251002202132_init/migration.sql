-- CreateTable
CREATE TABLE "host" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "cert" TEXT,
    "key" TEXT,
    "ca" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "two_fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_fa_secret" TEXT,
    "recovery_codes" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instances" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "host_id" INTEGER NOT NULL,
    "lxd_name" TEXT NOT NULL,
    "user_id" INTEGER,
    "cpu" INTEGER,
    "ram" INTEGER,
    "disk" INTEGER,
    "image_alias" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "port_forwards" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "host_id" INTEGER NOT NULL,
    "device_name" TEXT NOT NULL,
    "host_ip" TEXT NOT NULL,
    "host_port" INTEGER NOT NULL,
    "container_port" INTEGER NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'tcp',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "port_forwards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "instance_id" INTEGER,
    "instance_name" TEXT,
    "host_id" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "title" TEXT,
    "message" TEXT,
    "type" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "port_forwards" ADD CONSTRAINT "port_forwards_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "port_forwards" ADD CONSTRAINT "port_forwards_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "host"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
