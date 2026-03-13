import type { Prisma, PrismaClient } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../db/prisma.js";

type AuditInput = {
  actorId?: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  patientId?: number | null;
  visitId?: number | null;
  invoiceId?: number | null;
  admissionId?: number | null;
  request?: Request | null;
  client?: Prisma.TransactionClient | PrismaClient;
};

export const writeAuditLog = async (input: AuditInput) => {
  const client = input.client ?? prisma;

  await client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: String(input.entityId),
      description: input.description ?? null,
      ipAddress: input.request?.ip ?? input.request?.socket.remoteAddress ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      patientId: input.patientId ?? null,
      visitId: input.visitId ?? null,
      invoiceId: input.invoiceId ?? null,
      admissionId: input.admissionId ?? null,
    },
  });
};
