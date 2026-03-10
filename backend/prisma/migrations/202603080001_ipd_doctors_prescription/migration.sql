-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN "symptoms" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "diagnosis" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "advice" TEXT;

-- AlterTable
ALTER TABLE "HospitalSettings" ADD COLUMN "kansaltLogoPath" TEXT;

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "qualification" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "signaturePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IPDAdmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "visitId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "attendingDoctorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ADMITTED',
    "admittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" DATETIME,
    "ward" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "bed" TEXT NOT NULL,
    "diagnosis" TEXT,
    "reason" TEXT,
    "createdById" INTEGER,
    "dischargedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IPDAdmission_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IPDAdmission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IPDAdmission_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IPDAdmission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IPDAdmission_dischargedById_fkey" FOREIGN KEY ("dischargedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpdToIpdTransfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "opdVisitId" INTEGER NOT NULL,
    "ipdAdmissionId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "transferredById" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpdToIpdTransfer_opdVisitId_fkey" FOREIGN KEY ("opdVisitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpdToIpdTransfer_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "IPDAdmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpdToIpdTransfer_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OpdToIpdTransfer_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IPDAdmission_visitId_key" ON "IPDAdmission"("visitId");
CREATE INDEX "IPDAdmission_patientId_idx" ON "IPDAdmission"("patientId");
CREATE INDEX "IPDAdmission_attendingDoctorId_idx" ON "IPDAdmission"("attendingDoctorId");
CREATE INDEX "IPDAdmission_status_idx" ON "IPDAdmission"("status");
CREATE INDEX "IPDAdmission_admittedAt_idx" ON "IPDAdmission"("admittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpdToIpdTransfer_opdVisitId_key" ON "OpdToIpdTransfer"("opdVisitId");
CREATE UNIQUE INDEX "OpdToIpdTransfer_ipdAdmissionId_key" ON "OpdToIpdTransfer"("ipdAdmissionId");
CREATE INDEX "OpdToIpdTransfer_patientId_idx" ON "OpdToIpdTransfer"("patientId");
CREATE INDEX "OpdToIpdTransfer_transferredById_idx" ON "OpdToIpdTransfer"("transferredById");
CREATE INDEX "OpdToIpdTransfer_createdAt_idx" ON "OpdToIpdTransfer"("createdAt");
