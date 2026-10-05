-- AlterEnum
-- Counts password reset requests per email address, for the three-per-hour limit.
ALTER TYPE "AttemptKind" ADD VALUE 'PASSWORD_RESET_EMAIL';

-- UNDO, run by hand if ever needed. PostgreSQL cannot drop one value from an enum, so the
-- type is rebuilt without it. Delete the rows that use the value first.
--   DELETE FROM "FailedAttempt" WHERE "kind" = 'PASSWORD_RESET_EMAIL';
--   ALTER TYPE "AttemptKind" RENAME TO "AttemptKind_old";
--   CREATE TYPE "AttemptKind" AS ENUM ('MEMBER_LOGIN', 'ADMIN_LOGIN', 'CHECK_IN_CODE');
--   ALTER TABLE "FailedAttempt" ALTER COLUMN "kind" TYPE "AttemptKind" USING "kind"::text::"AttemptKind";
--   DROP TYPE "AttemptKind_old";
