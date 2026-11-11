-- CreateTable
CREATE TABLE "AccessKey" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "perm" TEXT NOT NULL DEFAULT 'draft',
    "last4" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessKey_scope_key" ON "AccessKey"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "AccessKey_hash_key" ON "AccessKey"("hash");
