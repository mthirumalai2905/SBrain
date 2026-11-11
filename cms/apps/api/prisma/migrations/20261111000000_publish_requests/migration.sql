-- CreateTable
CREATE TABLE "PublishRequest" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "replaces" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "PublishRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublishRequest_siteId_status_idx" ON "PublishRequest"("siteId", "status");

-- AddForeignKey
ALTER TABLE "PublishRequest" ADD CONSTRAINT "PublishRequest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishRequest" ADD CONSTRAINT "PublishRequest_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
