-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tokenHeader" TEXT NOT NULL DEFAULT '',
    "tokenEnc" TEXT,
    "allowWrites" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Connector_siteId_name_key" ON "Connector"("siteId", "name");

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
