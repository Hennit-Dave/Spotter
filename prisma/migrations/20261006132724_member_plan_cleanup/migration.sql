-- Migration B of two: cleanup. Run it only after the code stops reading the old columns, and only
-- after you have taken a Neon restore point. It drops data.

-- Accounts that were not LINKED never had a member under the new rules. They keep their name, email,
-- phone and answer, lose their password, and must use a fresh verification link to set one.
UPDATE "Account" SET "passwordHash" = NULL, "emailVerifiedAt" = NULL WHERE "status" <> 'LINKED';

-- AlterEnum: LINKED becomes ACTIVE. PENDING_LINK, REJECTED and UNVERIFIED become UNVERIFIED.
BEGIN;
CREATE TYPE "AccountStatus_new" AS ENUM ('UNVERIFIED', 'ACTIVE');
ALTER TABLE "Account" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "status" TYPE "AccountStatus_new"
  USING (CASE WHEN "status"::text = 'LINKED' THEN 'ACTIVE' ELSE 'UNVERIFIED' END)::"AccountStatus_new";
ALTER TYPE "AccountStatus" RENAME TO "AccountStatus_old";
ALTER TYPE "AccountStatus_new" RENAME TO "AccountStatus";
DROP TYPE "AccountStatus_old";
ALTER TABLE "Account" ALTER COLUMN "status" SET DEFAULT 'UNVERIFIED';
COMMIT;

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_linkedById_fkey";

-- DropIndex
DROP INDEX "Account_status_idx";
DROP INDEX "Account_claimedMembershipId_idx";
DROP INDEX "Member_creationKey_key";
DROP INDEX "Member_expiryDate_idx";

-- AlterTable: these columns and their data are gone for good.
ALTER TABLE "Account" DROP COLUMN "claimedMembershipId",
DROP COLUMN "linkFlag",
DROP COLUMN "linkedAt",
DROP COLUMN "linkedById";

ALTER TABLE "Member" DROP COLUMN "creationKey",
DROP COLUMN "expiryDate",
DROP COLUMN "tier";

-- DropEnum
DROP TYPE "LinkFlag";

-- UNDO. The columns and types can be recreated, but not their data. To get the data back, restore the
-- Neon restore point taken before this migration.
--   CREATE TYPE "LinkFlag" AS ENUM ('NO_SUCH_ID', 'NAME_MISMATCH', 'ALREADY_LINKED', 'DUPLICATE_CLAIM');
--   ALTER TABLE "Member" ADD COLUMN "tier" "Tier" NOT NULL DEFAULT 'FREE', ADD COLUMN "expiryDate" TIMESTAMP(3), ADD COLUMN "creationKey" TEXT;
--   CREATE UNIQUE INDEX "Member_creationKey_key" ON "Member"("creationKey");
--   CREATE INDEX "Member_expiryDate_idx" ON "Member"("expiryDate");
--   ALTER TABLE "Account" ADD COLUMN "claimedMembershipId" TEXT, ADD COLUMN "linkFlag" "LinkFlag", ADD COLUMN "linkedAt" TIMESTAMP(3), ADD COLUMN "linkedById" TEXT;
--   (rebuild AccountStatus with PENDING_LINK, LINKED and REJECTED, as database-changes.md describes)
