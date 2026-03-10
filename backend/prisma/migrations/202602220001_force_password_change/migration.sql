ALTER TABLE "User" ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "forcePasswordChange" = true
WHERE "username" = 'admin' AND "forcePasswordChange" = false;
