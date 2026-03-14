import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sims-hms-"));
const dbPath = path.join(tempRoot, "sims-test.db");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.UPLOAD_DIR_PATH = path.join(tempRoot, "uploads");
process.env.LOG_DIR = path.join(tempRoot, "logs");
process.env.ENABLE_FILE_LOGGING = "false";
process.env.CORS_ORIGIN = "*";

type Runtime = {
  app: typeof import("../src/app.js").app;
  applyLocalSqliteMigrations: typeof import("../src/bootstrap/startup.js").applyLocalSqliteMigrations;
  initializeRuntime: typeof import("../src/bootstrap/startup.js").initializeRuntime;
  prisma: typeof import("../src/db/prisma.js").prisma;
  hashPassword: typeof import("../src/utils/password.js").hashPassword;
};

let runtime: Runtime;
let server: Awaited<ReturnType<typeof import("node:http").createServer>> | null = null;
let baseUrl = "";
let receptionToken = "";
let doctorToken = "";
let doctorId = 0;
let createdPatientId = 0;
let createdVisitId = 0;
let createdInvoiceId = 0;
let createdAdmissionId = 0;

const jsonFetch = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const body = await response.json();
  return {
    status: response.status,
    body,
  };
};

const authHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

before(async () => {
  runtime = {
    app: (await import("../src/app.js")).app,
    applyLocalSqliteMigrations: (await import("../src/bootstrap/startup.js")).applyLocalSqliteMigrations,
    initializeRuntime: (await import("../src/bootstrap/startup.js")).initializeRuntime,
    prisma: (await import("../src/db/prisma.js")).prisma,
    hashPassword: (await import("../src/utils/password.js")).hashPassword,
  };

  await runtime.applyLocalSqliteMigrations(runtime.prisma);
  await runtime.initializeRuntime();

  const receptionPassword = "Reception@12345";
  const doctorPassword = "Doctor@12345";

  const reception = await runtime.prisma.user.upsert({
    where: { username: "reception.test" },
    update: {},
    create: {
      name: "Reception Test",
      username: "reception.test",
      role: "RECEPTION",
      passwordHash: await runtime.hashPassword(receptionPassword),
      active: true,
      forcePasswordChange: false,
    },
  });

  const doctor = await runtime.prisma.user.upsert({
    where: { username: "doctor.test" },
    update: {},
    create: {
      name: "Dr. Test",
      username: "doctor.test",
      role: "DOCTOR",
      passwordHash: await runtime.hashPassword(doctorPassword),
      active: true,
      forcePasswordChange: false,
      doctorProfile: {
        create: {
          qualification: "MBBS, MD",
          specialization: "General Medicine",
        },
      },
    },
    include: {
      doctorProfile: true,
    },
  });

  doctorId = doctor.id;

  server = runtime.app.listen(0);
  await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine test server address");
  }
  baseUrl = `http://127.0.0.1:${address.port}/api`;

  const receptionLogin = await jsonFetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: reception.username,
      password: receptionPassword,
    }),
  });
  receptionToken = receptionLogin.body.token;

  const doctorLogin = await jsonFetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: doctor.username,
      password: doctorPassword,
    }),
  });
  doctorToken = doctorLogin.body.token;
});

after(async () => {
  await runtime.prisma.$disconnect();
  await new Promise<void>((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("enterprise HMS workflow", { concurrency: false }, () => {
  test("registers a patient through the secured API", async () => {
    const response = await jsonFetch(`${baseUrl}/patients`, {
      method: "POST",
      headers: authHeaders(receptionToken),
      body: JSON.stringify({
        name: "Priya Enterprise",
        age: 32,
        gender: "FEMALE",
        phone: "9999912345",
        address: "Bengaluru",
      }),
    });

    assert.equal(response.status, 201);
    assert.ok(response.body.data.id);
    assert.match(response.body.data.mrn, /^MRN-/);
    createdPatientId = response.body.data.id;
  });

  test("creates OPD billing and auto-generates a printable prescription sheet after payment", async () => {
    const visitResponse = await jsonFetch(`${baseUrl}/visits`, {
      method: "POST",
      headers: authHeaders(receptionToken),
      body: JSON.stringify({
        patientId: createdPatientId,
        doctorId,
        type: "OPD",
        consultationFee: 650,
        reason: "Fever with cough",
      }),
    });

    assert.equal(visitResponse.status, 201);
    createdVisitId = visitResponse.body.data.id;

    const invoiceResponse = await jsonFetch(`${baseUrl}/invoices`, {
      method: "POST",
      headers: authHeaders(receptionToken),
      body: JSON.stringify({
        visitId: createdVisitId,
        invoiceType: "OPD",
        items: [
          {
            category: "CONSULTATION",
            name: "Consultation Fee",
            qty: 1,
            unitPrice: 650,
            discount: 0,
            tax: 0,
          },
        ],
        payments: [
          {
            paymentMode: "CASH",
            amount: 650,
          },
        ],
      }),
    });

    assert.equal(invoiceResponse.status, 201);
    assert.equal(invoiceResponse.body.data.paymentStatus, "PAID");
    assert.equal(invoiceResponse.body.data.dueAmount, 0);
    createdInvoiceId = invoiceResponse.body.data.id;

    const visitDetails = await jsonFetch(`${baseUrl}/visits/${createdVisitId}`, {
      headers: authHeaders(receptionToken),
    });

    assert.equal(visitDetails.status, 200);
    assert.equal(visitDetails.body.data.invoice.id, createdInvoiceId);
    assert.equal(visitDetails.body.data.prescription.invoiceId, createdInvoiceId);
  });

  test("allows the assigned doctor to complete the prescription after billing clearance", async () => {
    const response = await jsonFetch(`${baseUrl}/visits/${createdVisitId}/prescription`, {
      method: "PUT",
      headers: authHeaders(doctorToken),
      body: JSON.stringify({
        symptoms: "Fever, cough",
        diagnosis: "Upper respiratory tract infection",
        advice: "Rest and hydration",
        items: [
          {
            medicine: "Paracetamol 650",
            dosage: "1 tablet",
            frequency: "Twice daily",
            durationDays: 3,
            instruction: "After food",
          },
        ],
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.visitId, createdVisitId);
    assert.match(response.body.data.itemsJson, /Paracetamol/);
  });

  test("admits OPD patient to IPD, occupies a bed, and releases it on discharge", async () => {
    const roomsResponse = await jsonFetch(`${baseUrl}/rooms`, {
      headers: authHeaders(receptionToken),
    });
    assert.equal(roomsResponse.status, 200);

    const room = roomsResponse.body.data.find((entry: any) =>
      entry.beds.some((bed: any) => bed.status === "AVAILABLE" || bed.status === "RESERVED"),
    );
    assert.ok(room);
    const bed = room.beds.find((entry: any) => entry.status === "AVAILABLE" || entry.status === "RESERVED");
    assert.ok(bed);

    const transferResponse = await jsonFetch(`${baseUrl}/visits/${createdVisitId}/transfer-to-ipd`, {
      method: "POST",
      headers: authHeaders(receptionToken),
      body: JSON.stringify({
        attendingDoctorId: doctorId,
        roomId: room.id,
        bedId: bed.id,
        ward: room.ward,
        room: room.name,
        bed: bed.bedNumber,
        diagnosis: "Observation",
        reason: "Requires inpatient monitoring",
      }),
    });

    assert.equal(transferResponse.status, 201);
    createdAdmissionId = transferResponse.body.data.id;
    assert.equal(transferResponse.body.data.bedId, bed.id);

    const occupiedBed = await runtime.prisma.bed.findUniqueOrThrow({ where: { id: bed.id } });
    assert.equal(occupiedBed.status, "OCCUPIED");

    const dischargeResponse = await jsonFetch(`${baseUrl}/ipd/${createdAdmissionId}/discharge`, {
      method: "POST",
      headers: authHeaders(doctorToken),
      body: JSON.stringify({
        dischargeNote: "Stable for discharge",
      }),
    });

    assert.equal(dischargeResponse.status, 200);
    assert.equal(dischargeResponse.body.data.status, "DISCHARGED");

    const releasedBed = await runtime.prisma.bed.findUniqueOrThrow({ where: { id: bed.id } });
    assert.equal(releasedBed.status, "AVAILABLE");
  });
});
