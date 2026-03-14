PRAGMA foreign_keys=OFF;

CREATE TABLE "Invoice_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "visitId" INTEGER NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "patientId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "invoiceType" TEXT NOT NULL DEFAULT 'OPD',
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "paidAmount" REAL NOT NULL,
    "dueAmount" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMode" TEXT,
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "Invoice_new" (
    "id",
    "visitId",
    "invoiceNo",
    "patientId",
    "doctorId",
    "invoiceType",
    "subtotal",
    "discount",
    "tax",
    "total",
    "paidAmount",
    "dueAmount",
    "paymentStatus",
    "paymentMode",
    "notes",
    "createdById",
    "createdAt",
    "updatedAt"
)
SELECT
    "Invoice"."id",
    "Invoice"."visitId",
    "Invoice"."invoiceNo",
    "Visit"."patientId",
    "Visit"."doctorId",
    CASE
        WHEN "Visit"."type" = 'IPD' THEN 'IPD'
        ELSE 'OPD'
    END,
    "Invoice"."subtotal",
    "Invoice"."discount",
    "Invoice"."tax",
    "Invoice"."total",
    "Invoice"."paidAmount",
    "Invoice"."dueAmount",
    CASE
        WHEN COALESCE("Invoice"."dueAmount", 0) <= 0 THEN 'PAID'
        WHEN COALESCE("Invoice"."paidAmount", 0) > 0 THEN 'PARTIAL'
        ELSE 'PENDING'
    END,
    "Invoice"."paymentMode",
    "Invoice"."notes",
    "Invoice"."createdById",
    "Invoice"."createdAt",
    "Invoice"."updatedAt"
FROM "Invoice"
INNER JOIN "Visit" ON "Visit"."id" = "Invoice"."visitId";

ALTER TABLE "Invoice" RENAME TO "Invoice_legacy";
ALTER TABLE "Invoice_new" RENAME TO "Invoice";
DROP TABLE "Invoice_legacy";

ALTER TABLE "InvoiceItem" RENAME TO "InvoiceItem_legacy";

CREATE TABLE "InvoiceItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceId" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MISC',
    "name" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "InvoiceItem" ("id", "invoiceId", "category", "name", "qty", "unitPrice", "discount", "tax", "amount")
SELECT "id", "invoiceId", "category", "name", "qty", "unitPrice", "discount", "tax", "amount"
FROM "InvoiceItem_legacy";

DROP TABLE "InvoiceItem_legacy";

CREATE UNIQUE INDEX "Invoice_visitId_key" ON "Invoice"("visitId");
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
CREATE INDEX "Invoice_patientId_createdAt_idx" ON "Invoice"("patientId", "createdAt");
CREATE INDEX "Invoice_doctorId_createdAt_idx" ON "Invoice"("doctorId", "createdAt");
CREATE INDEX "Invoice_paymentStatus_createdAt_idx" ON "Invoice"("paymentStatus", "createdAt");
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

ALTER TABLE "HospitalSettings" ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "HospitalSettings" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

ALTER TABLE "IPDAdmission" ADD COLUMN "roomId" INTEGER;
ALTER TABLE "IPDAdmission" ADD COLUMN "bedId" INTEGER;

CREATE TABLE "Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ward" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Bed" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Room_ward_name_key" ON "Room"("ward", "name");
CREATE INDEX "Room_ward_active_idx" ON "Room"("ward", "active");
CREATE UNIQUE INDEX "Bed_roomId_bedNumber_key" ON "Bed"("roomId", "bedNumber");
CREATE INDEX "Bed_status_active_idx" ON "Bed"("status", "active");

INSERT OR IGNORE INTO "Room" ("ward", "name", "createdAt", "updatedAt")
SELECT DISTINCT "ward", "room", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "IPDAdmission"
WHERE "ward" IS NOT NULL AND "room" IS NOT NULL;

INSERT OR IGNORE INTO "Bed" ("roomId", "bedNumber", "status", "createdAt", "updatedAt")
SELECT DISTINCT
    "Room"."id",
    "IPDAdmission"."bed",
    CASE
        WHEN "IPDAdmission"."status" = 'ADMITTED' THEN 'OCCUPIED'
        ELSE 'AVAILABLE'
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "IPDAdmission"
INNER JOIN "Room"
    ON "Room"."ward" = "IPDAdmission"."ward"
   AND "Room"."name" = "IPDAdmission"."room"
WHERE "IPDAdmission"."bed" IS NOT NULL;

UPDATE "IPDAdmission"
SET "roomId" = (
    SELECT "Room"."id"
    FROM "Room"
    WHERE "Room"."ward" = "IPDAdmission"."ward"
      AND "Room"."name" = "IPDAdmission"."room"
    LIMIT 1
),
"bedId" = (
    SELECT "Bed"."id"
    FROM "Bed"
    INNER JOIN "Room" ON "Room"."id" = "Bed"."roomId"
    WHERE "Room"."ward" = "IPDAdmission"."ward"
      AND "Room"."name" = "IPDAdmission"."room"
      AND "Bed"."bedNumber" = "IPDAdmission"."bed"
    LIMIT 1
);

CREATE INDEX "IPDAdmission_bedId_status_idx" ON "IPDAdmission"("bedId", "status");

CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Payment_invoiceId_receivedAt_idx" ON "Payment"("invoiceId", "receivedAt");
CREATE INDEX "Payment_patientId_receivedAt_idx" ON "Payment"("patientId", "receivedAt");

INSERT INTO "Payment" (
    "invoiceId",
    "patientId",
    "amount",
    "paymentMode",
    "notes",
    "receivedAt",
    "recordedById",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "patientId",
    "paidAmount",
    COALESCE("paymentMode", 'CASH'),
    "notes",
    "createdAt",
    "createdById",
    "createdAt",
    "updatedAt"
FROM "Invoice"
WHERE COALESCE("paidAmount", 0) > 0;

CREATE TABLE "Permission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

CREATE TABLE "RolePermission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role" TEXT NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

CREATE TABLE "AuditLog" (
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

CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_patientId_createdAt_idx" ON "AuditLog"("patientId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

CREATE INDEX "Visit_type_status_scheduledAt_idx" ON "Visit"("type", "status", "scheduledAt");

INSERT INTO "Permission" ("code", "name", "description") VALUES
    ('dashboard:view', 'View Dashboard', 'Access operational dashboards and KPIs'),
    ('patients:manage', 'Manage Patients', 'Create and update patient registrations'),
    ('opd:manage', 'Manage OPD', 'Create OPD visits and move patients through the queue'),
    ('ipd:manage', 'Manage IPD', 'Admit, allocate beds, and discharge inpatients'),
    ('billing:manage', 'Manage Billing', 'Create invoices and collect payments'),
    ('prescriptions:manage', 'Manage Prescriptions', 'Create and print prescriptions'),
    ('reports:view', 'View Reports', 'Access operational and revenue reports'),
    ('settings:manage', 'Manage Settings', 'Update organization settings and master data'),
    ('users:manage', 'Manage Users', 'Manage users, roles, and access');

INSERT INTO "RolePermission" ("role", "permissionId")
SELECT 'ADMIN', "id" FROM "Permission";

INSERT INTO "RolePermission" ("role", "permissionId")
SELECT 'RECEPTION', "id"
FROM "Permission"
WHERE "code" IN ('dashboard:view', 'patients:manage', 'opd:manage', 'ipd:manage', 'billing:manage', 'prescriptions:manage', 'reports:view');

INSERT INTO "RolePermission" ("role", "permissionId")
SELECT 'DOCTOR', "id"
FROM "Permission"
WHERE "code" IN ('dashboard:view', 'ipd:manage', 'prescriptions:manage', 'reports:view');

INSERT INTO "RolePermission" ("role", "permissionId")
SELECT 'BILLING', "id"
FROM "Permission"
WHERE "code" IN ('dashboard:view', 'billing:manage', 'reports:view');

INSERT INTO "RolePermission" ("role", "permissionId")
SELECT 'PHARMACY', "id"
FROM "Permission"
WHERE "code" IN ('dashboard:view', 'billing:manage', 'reports:view');

INSERT INTO "RolePermission" ("role", "permissionId")
SELECT 'LAB_TECHNICIAN', "id"
FROM "Permission"
WHERE "code" IN ('dashboard:view', 'reports:view');

PRAGMA foreign_keys=ON;
