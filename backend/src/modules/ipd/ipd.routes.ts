import { Router } from "express";
import dayjs from "dayjs";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate, authorize, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { IPD_ADMISSION_STATUSES } from "../../types/domain.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/appError.js";
import { parsePage } from "../../utils/pagination.js";

const router = Router();

const listQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(IPD_ADMISSION_STATUSES).optional(),
  doctorId: z.string().regex(/^\d+$/).optional(),
  date: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

const createAdmissionSchema = z.object({
  patientId: z.number().int().positive(),
  attendingDoctorId: z.number().int().positive(),
  ward: z.string().min(1).max(120),
  room: z.string().min(1).max(120),
  bed: z.string().min(1).max(120),
  diagnosis: z.string().max(5000).optional(),
  reason: z.string().max(5000).optional(),
  admittedAt: z.string().datetime().optional(),
});

const updateAdmissionSchema = z.object({
  attendingDoctorId: z.number().int().positive().optional(),
  ward: z.string().min(1).max(120).optional(),
  room: z.string().min(1).max(120).optional(),
  bed: z.string().min(1).max(120).optional(),
  diagnosis: z.string().max(5000).optional().nullable(),
  reason: z.string().max(5000).optional().nullable(),
});

const dischargeSchema = z.object({
  dischargeNote: z.string().max(5000).optional(),
  dischargedAt: z.string().datetime().optional(),
});

router.use(authenticate);

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { q, status, doctorId, date, page, pageSize } = req.query as z.infer<typeof listQuerySchema>;
    const { skip, take, page: safePage, pageSize: safeSize } = parsePage(page, pageSize);

    const selectedDay = date ? dayjs(date) : null;
    const dayStart = selectedDay?.startOf("day").toDate();
    const dayEnd = selectedDay?.endOf("day").toDate();

    const where = {
      status: status ?? undefined,
      attendingDoctorId: req.user?.role === "DOCTOR" ? req.user.id : doctorId ? Number(doctorId) : undefined,
      admittedAt: dayStart && dayEnd ? { gte: dayStart, lte: dayEnd } : undefined,
      OR: q
        ? [
            { patient: { name: { contains: q } } },
            { patient: { phone: { contains: q } } },
            { patient: { mrn: { contains: q } } },
            { ward: { contains: q } },
            { room: { contains: q } },
            { bed: { contains: q } },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      prisma.iPDAdmission.count({ where }),
      prisma.iPDAdmission.findMany({
        where,
        include: {
          patient: true,
          visit: {
            include: {
              invoice: { select: { id: true, invoiceNo: true, dueAmount: true } },
            },
          },
          attendingDoctor: {
            select: {
              id: true,
              name: true,
              doctorProfile: { select: { qualification: true, specialization: true } },
            },
          },
          transfer: true,
        },
        orderBy: [{ status: "asc" }, { admittedAt: "desc" }],
        skip,
        take,
      }),
    ]);

    res.json({
      data: rows,
      pagination: {
        page: safePage,
        pageSize: safeSize,
        total,
        totalPages: Math.ceil(total / safeSize),
      },
    });
  }),
);

router.get(
  "/:id",
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;

    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: Number(id) },
      include: {
        patient: true,
        visit: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                doctorProfile: { select: { qualification: true, specialization: true } },
              },
            },
            invoice: true,
            prescription: true,
            notes: { orderBy: { createdAt: "desc" } },
          },
        },
        attendingDoctor: {
          select: {
            id: true,
            name: true,
            doctorProfile: { select: { qualification: true, specialization: true } },
          },
        },
        transfer: true,
      },
    });

    if (!admission) {
      throw new AppError("IPD admission not found", 404);
    }

    res.json({ data: admission });
  }),
);

router.post(
  "/",
  authorize("ADMIN", "RECEPTION"),
  validateBody(createAdmissionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const payload = req.body as z.infer<typeof createAdmissionSchema>;

    const [patient, doctor] = await Promise.all([
      prisma.patient.findUnique({ where: { id: payload.patientId } }),
      prisma.user.findFirst({ where: { id: payload.attendingDoctorId, role: "DOCTOR", active: true } }),
    ]);

    if (!patient) {
      throw new AppError("Patient not found", 404);
    }

    if (!doctor) {
      throw new AppError("Attending doctor not found", 400);
    }

    const created = await prisma.$transaction(async (tx: any) => {
      const visit = await tx.visit.create({
        data: {
          patientId: payload.patientId,
          doctorId: payload.attendingDoctorId,
          createdById: req.user?.id,
          type: "IPD",
          status: "IN_PROGRESS",
          consultationFee: 0,
          reason: payload.reason ?? null,
          scheduledAt: payload.admittedAt ? new Date(payload.admittedAt) : new Date(),
        },
      });

      return tx.iPDAdmission.create({
        data: {
          visitId: visit.id,
          patientId: payload.patientId,
          attendingDoctorId: payload.attendingDoctorId,
          ward: payload.ward,
          room: payload.room,
          bed: payload.bed,
          diagnosis: payload.diagnosis ?? null,
          reason: payload.reason ?? null,
          admittedAt: payload.admittedAt ? new Date(payload.admittedAt) : new Date(),
          createdById: req.user?.id,
        },
        include: {
          patient: true,
          visit: true,
          attendingDoctor: { select: { id: true, name: true } },
        },
      });
    });

    res.status(201).json({ data: created });
  }),
);

router.patch(
  "/:id",
  authorize("ADMIN", "RECEPTION"),
  validateParams(idParamsSchema),
  validateBody(updateAdmissionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const payload = req.body as z.infer<typeof updateAdmissionSchema>;

    const existing = await prisma.iPDAdmission.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      throw new AppError("IPD admission not found", 404);
    }

    if (payload.attendingDoctorId) {
      const doctor = await prisma.user.findFirst({
        where: { id: payload.attendingDoctorId, role: "DOCTOR", active: true },
        select: { id: true },
      });
      if (!doctor) {
        throw new AppError("Attending doctor not found", 400);
      }
    }

    const updated = await prisma.iPDAdmission.update({
      where: { id: Number(id) },
      data: {
        attendingDoctorId: payload.attendingDoctorId ?? undefined,
        ward: payload.ward ?? undefined,
        room: payload.room ?? undefined,
        bed: payload.bed ?? undefined,
        diagnosis: payload.diagnosis ?? undefined,
        reason: payload.reason ?? undefined,
      },
      include: {
        patient: true,
        visit: true,
        attendingDoctor: { select: { id: true, name: true } },
      },
    });

    res.json({ data: updated });
  }),
);

router.post(
  "/:id/discharge",
  authorize("ADMIN", "RECEPTION", "DOCTOR"),
  validateParams(idParamsSchema),
  validateBody(dischargeSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const payload = req.body as z.infer<typeof dischargeSchema>;

    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: Number(id) },
      include: { visit: true },
    });

    if (!admission) {
      throw new AppError("IPD admission not found", 404);
    }

    if (admission.status === "DISCHARGED") {
      throw new AppError("Patient is already discharged", 400);
    }

    if (req.user?.role === "DOCTOR" && admission.attendingDoctorId !== req.user.id) {
      throw new AppError("You can only discharge your assigned IPD patients", 403);
    }

    const dischargeAt = payload.dischargedAt ? new Date(payload.dischargedAt) : new Date();

    const updated = await prisma.$transaction(async (tx: any) => {
      const row = await tx.iPDAdmission.update({
        where: { id: admission.id },
        data: {
          status: "DISCHARGED",
          dischargedAt: dischargeAt,
          dischargedById: req.user?.id,
        },
        include: {
          patient: true,
          visit: true,
          attendingDoctor: { select: { id: true, name: true } },
        },
      });

      await tx.visit.update({
        where: { id: admission.visitId },
        data: {
          status: "COMPLETED",
          completedAt: dischargeAt,
          reason: payload.dischargeNote ? `${admission.visit.reason ?? ""}\nDischarge note: ${payload.dischargeNote}`.trim() : undefined,
        },
      });

      return row;
    });

    res.json({ data: updated });
  }),
);

export const ipdRouter = router;
