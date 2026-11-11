-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EntryVersion" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "typeName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'cms',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "entryId" TEXT,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'cms',
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryVersion_entryId_createdAt_idx" ON "EntryVersion"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX "EntryVersion_siteId_createdAt_idx" ON "EntryVersion"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_siteId_createdAt_idx" ON "Notification"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_emailedAt_idx" ON "Notification"("emailedAt");
