PRAGMA foreign_keys=OFF;

CREATE TABLE "AuditLog_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "description" TEXT,
    "ipAddress" TEXT,
    "metadataJson" TEXT,
    "patientId" INTEGER,
    "visitId" INTEGER,
    "invoiceId" INTEGER,
    "admissionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "IPDAdmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "AuditLog_new" (
    "id",
    "actorId",
    "action",
    "entityType",
    "entityId",
    "description",
    "ipAddress",
    "metadataJson",
    "patientId",
    "visitId",
    "invoiceId",
    "admissionId",
    "createdAt"
)
SELECT
    "id",
    "actorId",
    "action",
    "entityType",
    "entityId",
    "description",
    "ipAddress",
    "metadataJson",
    "patientId",
    "visitId",
    "invoiceId",
    "admissionId",
    "createdAt"
FROM "AuditLog";

DROP TABLE "AuditLog";
ALTER TABLE "AuditLog_new" RENAME TO "AuditLog";

CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_patientId_createdAt_idx" ON "AuditLog"("patientId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

PRAGMA foreign_keys=ON;
