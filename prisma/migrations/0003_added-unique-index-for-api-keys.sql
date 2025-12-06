-- DropIndex
DROP INDEX "ApiKeys_public_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeys_public_key" ON "ApiKeys"("public");

