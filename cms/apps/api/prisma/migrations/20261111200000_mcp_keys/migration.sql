-- CreateTable
CREATE TABLE "McpKey" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "tool" TEXT NOT NULL DEFAULT 'other',
    "label" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "keyEnc" TEXT,
    "perm" TEXT NOT NULL DEFAULT 'draft',
    "last4" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpKey_hash_key" ON "McpKey"("hash");

-- CreateIndex
CREATE INDEX "McpKey_siteId_idx" ON "McpKey"("siteId");

-- AddForeignKey
ALTER TABLE "McpKey" ADD CONSTRAINT "McpKey_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep the keys that already exist working. They were stored as hashes only, so they cannot be shown again.
INSERT INTO "McpKey" ("id", "siteId", "tool", "label", "hash", "perm", "last4", "createdAt")
SELECT "id", "siteId", 'claude-code', 'Claude (earlier key)', "tokenEnc",
       COALESCE(NULLIF(("description"::json)->>'perm', ''), 'draft'), COALESCE(("description"::json)->>'last4', ''), "createdAt"
FROM "Connector" WHERE "kind" = 'claude' AND "tokenEnc" IS NOT NULL;

INSERT INTO "McpKey" ("id", "siteId", "tool", "label", "hash", "perm", "last4", "createdAt")
SELECT "id", NULL, 'claude-code', 'Claude (earlier all-sites key)', "hash", "perm", "last4", "createdAt" FROM "AccessKey";

DELETE FROM "Connector" WHERE "kind" = 'claude';

-- DropTable
DROP TABLE "AccessKey";
