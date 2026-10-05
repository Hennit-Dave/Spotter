-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('BASIC', 'PREMIUM');

-- CreateEnum
CREATE TYPE "CardCategory" AS ENUM ('TIMETABLE', 'PRICES', 'RULES', 'ACCESS_HOURS', 'GUEST_POLICY', 'PAUSE_CANCELLATION', 'TRAINING_PLAN', 'TRAINER_GUIDANCE');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('CODE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('RENEWAL', 'BALANCE');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CHARGE', 'PAYMENT');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "MemberField" AS ENUM ('TIER', 'EXPIRY');

-- CreateEnum
CREATE TYPE "RefusalReason" AS ENUM ('NO_RECORD', 'ANOTHER_MEMBER', 'MEDICAL', 'LIVE_DOOR', 'MONEY_RULING', 'STAFF_CONDUCT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('UNVERIFIED', 'PENDING_LINK', 'LINKED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LinkFlag" AS ENUM ('NO_SUCH_ID', 'NAME_MISMATCH', 'ALREADY_LINKED', 'DUPLICATE_CLAIM');

-- CreateEnum
CREATE TYPE "EmailTokenType" AS ENUM ('VERIFY', 'RESET');

-- CreateEnum
CREATE TYPE "AttemptKind" AS ENUM ('MEMBER_LOGIN', 'ADMIN_LOGIN', 'CHECK_IN_CODE');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "status" "AccountStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "emailVerifiedAt" TIMESTAMP(3),
    "claimedMembershipId" TEXT NOT NULL,
    "linkFlag" "LinkFlag",
    "memberId" TEXT,
    "linkedById" TEXT,
    "linkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "staffId" TEXT,
    "type" "EmailTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedAttempt" (
    "id" TEXT NOT NULL,
    "kind" "AttemptKind" NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'BASIC',
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "openingBalanceSet" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberChange" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "field" "MemberField" NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "category" "CardCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardVersion" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "minTier" "Tier" NOT NULL DEFAULT 'BASIC',
    "status" "CardStatus" NOT NULL DEFAULT 'DRAFT',
    "lastConfirmedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardEmbedding" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "cardVersionId" TEXT NOT NULL,
    "category" "CardCategory" NOT NULL,
    "minTier" "Tier" NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "source" "AttendanceSource" NOT NULL,
    "checkInCodeId" TEXT,
    "enteredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod",
    "note" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "paymentAttemptId" TEXT,
    "gatewayReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "gatewayReference" TEXT,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerFound" BOOLEAN NOT NULL,
    "cardVersionId" TEXT,
    "refused" BOOLEAN NOT NULL DEFAULT false,
    "refusalReason" "RefusalReason",
    "handedOff" BOOLEAN NOT NULL DEFAULT false,
    "handoffStaffId" TEXT,
    "resolvedByRouter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongAnswerReport" (
    "id" TEXT NOT NULL,
    "questionLogId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WrongAnswerReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Duty" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Duty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_memberId_key" ON "Account"("memberId");

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE INDEX "Account_claimedMembershipId_idx" ON "Account"("claimedMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailToken_accountId_idx" ON "EmailToken"("accountId");

-- CreateIndex
CREATE INDEX "EmailToken_staffId_idx" ON "EmailToken"("staffId");

-- CreateIndex
CREATE INDEX "FailedAttempt_kind_key_createdAt_idx" ON "FailedAttempt"("kind", "key", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_membershipId_key" ON "Member"("membershipId");

-- CreateIndex
CREATE INDEX "Member_expiryDate_idx" ON "Member"("expiryDate");

-- CreateIndex
CREATE INDEX "MemberChange_memberId_idx" ON "MemberChange"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_phone_key" ON "Staff"("phone");

-- CreateIndex
CREATE INDEX "CardVersion_cardId_idx" ON "CardVersion"("cardId");

-- CreateIndex
CREATE INDEX "CardVersion_status_minTier_idx" ON "CardVersion"("status", "minTier");

-- CreateIndex
CREATE UNIQUE INDEX "CardEmbedding_cardVersionId_key" ON "CardEmbedding"("cardVersionId");

-- CreateIndex
CREATE INDEX "CardEmbedding_minTier_idx" ON "CardEmbedding"("minTier");

-- CreateIndex
CREATE INDEX "Attendance_memberId_idx" ON "Attendance"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_memberId_day_key" ON "Attendance"("memberId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInCode_day_key" ON "CheckInCode"("day");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_paymentAttemptId_key" ON "LedgerEntry"("paymentAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_gatewayReference_key" ON "LedgerEntry"("gatewayReference");

-- CreateIndex
CREATE INDEX "LedgerEntry_memberId_idx" ON "LedgerEntry"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_gatewayReference_key" ON "PaymentAttempt"("gatewayReference");

-- CreateIndex
CREATE INDEX "PaymentAttempt_memberId_idx" ON "PaymentAttempt"("memberId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");

-- CreateIndex
CREATE INDEX "QuestionLog_memberId_idx" ON "QuestionLog"("memberId");

-- CreateIndex
CREATE INDEX "QuestionLog_answerFound_idx" ON "QuestionLog"("answerFound");

-- CreateIndex
CREATE INDEX "QuestionLog_createdAt_idx" ON "QuestionLog"("createdAt");

-- CreateIndex
CREATE INDEX "WrongAnswerReport_createdAt_idx" ON "WrongAnswerReport"("createdAt");

-- CreateIndex
CREATE INDEX "Duty_active_idx" ON "Duty"("active");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberChange" ADD CONSTRAINT "MemberChange_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberChange" ADD CONSTRAINT "MemberChange_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardVersion" ADD CONSTRAINT "CardVersion_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardVersion" ADD CONSTRAINT "CardVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardVersion" ADD CONSTRAINT "CardVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardEmbedding" ADD CONSTRAINT "CardEmbedding_cardVersionId_fkey" FOREIGN KEY ("cardVersionId") REFERENCES "CardVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_checkInCodeId_fkey" FOREIGN KEY ("checkInCodeId") REFERENCES "CheckInCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInCode" ADD CONSTRAINT "CheckInCode_setById_fkey" FOREIGN KEY ("setById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionLog" ADD CONSTRAINT "QuestionLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongAnswerReport" ADD CONSTRAINT "WrongAnswerReport_questionLogId_fkey" FOREIGN KEY ("questionLogId") REFERENCES "QuestionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongAnswerReport" ADD CONSTRAINT "WrongAnswerReport_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duty" ADD CONSTRAINT "Duty_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Raw SQL below. Prisma cannot express a partial unique index or a CHECK constraint.
-- The vector extension is already created at the top of this file by Prisma.

-- Exactly one on-duty row may be active.
CREATE UNIQUE INDEX one_active_duty ON "Duty" (active) WHERE active = true;

-- Every EmailToken belongs to exactly one of an Account or a Staff row.
ALTER TABLE "EmailToken" ADD CONSTRAINT email_token_one_owner
  CHECK (("accountId" IS NULL) <> ("staffId" IS NULL));

-- UNDO for the two raw statements, run by hand if ever needed:
--   DROP INDEX one_active_duty;
--   ALTER TABLE "EmailToken" DROP CONSTRAINT email_token_one_owner;
-- The vector extension is left in place on undo, because the CardEmbedding table uses it.
-- To undo the whole migration on an empty database, drop the schema and re-run.
