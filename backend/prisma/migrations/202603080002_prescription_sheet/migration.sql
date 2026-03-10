-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN "patientId" INTEGER;
ALTER TABLE "Prescription" ADD COLUMN "invoiceId" INTEGER;
ALTER TABLE "Prescription" ADD COLUMN "printedAt" DATETIME;
ALTER TABLE "Prescription" ADD COLUMN "templateType" TEXT NOT NULL DEFAULT 'OP_CASE_SHEET';
ALTER TABLE "Prescription" ADD COLUMN "notes" TEXT;

-- Backfill patient relation from visit
UPDATE "Prescription"
SET "patientId" = (
  SELECT "patientId"
  FROM "Visit"
  WHERE "Visit"."id" = "Prescription"."visitId"
);

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");
CREATE INDEX "Prescription_invoiceId_idx" ON "Prescription"("invoiceId");
CREATE UNIQUE INDEX "Prescription_invoiceId_key" ON "Prescription"("invoiceId");
