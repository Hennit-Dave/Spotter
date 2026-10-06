-- Migration A of two: the plan model, additive. Nothing is dropped here.
-- Old columns (Member.tier, Member.expiryDate, Member.creationKey, the Account claim columns and
-- the old AccountStatus values) stay until migration B, after the code stops reading them.

-- CreateEnum
CREATE TYPE "ChangeSource" AS ENUM ('STAFF', 'PAYMENT');

-- AlterEnum
-- Rename the plan values in place. Every row that held BASIC now holds FREE, and every row that
-- held PREMIUM now holds PAID. This keeps cards, embeddings, question logs and members as they were.
ALTER TYPE "Tier" RENAME VALUE 'BASIC' TO 'FREE';
ALTER TYPE "Tier" RENAME VALUE 'PREMIUM' TO 'PAID';

-- AlterEnum
ALTER TYPE "PaymentAttemptStatus" ADD VALUE 'NEEDS_REVIEW';
ALTER TYPE "MemberField" ADD VALUE 'PAID_UNTIL';
ALTER TYPE "MemberField" ADD VALUE 'CLAIMS_EXISTING';
ALTER TYPE "MemberField" ADD VALUE 'ACCESS_CARD';
ALTER TYPE "AttemptKind" ADD VALUE 'VERIFICATION_EMAIL';

-- AlterTable Account
-- Phone and the existing-member answer are new and required. Existing rows get an empty phone and an
-- answer taken from their old status: a LINKED account belonged to an existing member.
ALTER TABLE "Account" ADD COLUMN "phone" TEXT,
ADD COLUMN "claimsExistingMember" BOOLEAN,
ALTER COLUMN "passwordHash" DROP NOT NULL;
UPDATE "Account" SET "phone" = '', "claimsExistingMember" = ("status" = 'LINKED');
ALTER TABLE "Account" ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "claimsExistingMember" SET NOT NULL;

-- AlterTable Member
ALTER TABLE "Member" ADD COLUMN "accessCardIssuedAt" TIMESTAMP(3),
ADD COLUMN "accessCardIssuedById" TEXT,
ADD COLUMN "claimsExistingMember" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "paidUntil" DATE;
-- Every member that exists today was created by staff, so they are existing members.
UPDATE "Member" SET "claimsExistingMember" = true;
-- A former PREMIUM member is PAID through their old expiry date. A former BASIC member has no paid time.
-- Their old expiry date is kept in expiryDate until migration B.
UPDATE "Member" SET "paidUntil" = "expiryDate"::date WHERE "tier" = 'PAID';

-- AlterTable MemberChange
ALTER TABLE "MemberChange" ADD COLUMN "paymentAttemptId" TEXT,
ADD COLUMN "source" "ChangeSource" NOT NULL DEFAULT 'STAFF',
ALTER COLUMN "authorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "intValue" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Account_status_createdAt_idx" ON "Account"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Member_paidUntil_idx" ON "Member"("paidUntil");

-- CreateIndex
CREATE UNIQUE INDEX "MemberChange_paymentAttemptId_key" ON "MemberChange"("paymentAttemptId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_accessCardIssuedById_fkey" FOREIGN KEY ("accessCardIssuedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberChange" ADD CONSTRAINT "MemberChange_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- UNDO, run by hand if ever needed, in this order. Nothing was dropped, so no data is lost.
--   DROP TABLE "AppSetting";
--   ALTER TABLE "MemberChange" DROP CONSTRAINT "MemberChange_paymentAttemptId_fkey";
--   DROP INDEX "MemberChange_paymentAttemptId_key";
--   ALTER TABLE "MemberChange" DROP COLUMN "paymentAttemptId", DROP COLUMN "source";
--   (restoring NOT NULL on MemberChange.authorId is only possible if no row has a null author)
--   ALTER TABLE "Member" DROP CONSTRAINT "Member_accessCardIssuedById_fkey";
--   DROP INDEX "Member_paidUntil_idx";
--   ALTER TABLE "Member" DROP COLUMN "accessCardIssuedAt", DROP COLUMN "accessCardIssuedById", DROP COLUMN "claimsExistingMember", DROP COLUMN "paidUntil";
--   DROP INDEX "Account_status_createdAt_idx";
--   ALTER TABLE "Account" DROP COLUMN "phone", DROP COLUMN "claimsExistingMember";
--   (restoring NOT NULL on Account.passwordHash is only possible if no row has a null hash)
--   DROP TYPE "ChangeSource";
--   ALTER TYPE "Tier" RENAME VALUE 'FREE' TO 'BASIC';
--   ALTER TYPE "Tier" RENAME VALUE 'PAID' TO 'PREMIUM';
-- PostgreSQL cannot drop the five added enum values. Leaving them in place is harmless. To remove
-- them, rebuild each type the way database-changes.md describes.
