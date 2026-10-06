-- AlterTable
-- A random key carried by the add member form. A second submit with the same key creates nothing,
-- so a double tap or a resent request cannot make two members. Existing rows have no key.
ALTER TABLE "Member" ADD COLUMN "creationKey" TEXT;

-- CreateIndex
-- A unique index allows many NULLs, so members created without a key are unaffected.
CREATE UNIQUE INDEX "Member_creationKey_key" ON "Member"("creationKey");

-- UNDO, run by hand if ever needed. Nothing else depends on the column.
--   DROP INDEX "Member_creationKey_key";
--   ALTER TABLE "Member" DROP COLUMN "creationKey";
