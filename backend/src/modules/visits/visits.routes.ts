import { Router } from "express";
import dayjs from "dayjs";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate, authorize, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { GENDERS, VISIT_STATUSES, VISIT_TYPES } from "../../types/domain.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/appError.js";
import { generateMrn } from "../../utils/id.js";
import { parsePage } from "../../utils/pagination.js";

const router = Router();

const createVisitSchema = z
  .object({
    patientId: z.number().int().positive().optional(),
    patient: z
      .object({
        name: z.string().min(2),
        age: z.number().int().min(0).max(130).optional(),
        gender: z.enum(GENDERS),
        phone: z.string().min(7).max(15),
        address: z.string().min(2),
        idProof: z.string().max(100).optional(),
      })
      .optional(),
    doctorId: z.number().int().positive(),
    consultationFee: z.number().nonnegative().optional(),
    type: z.enum(VISIT_TYPES).default("OPD"),
    reason: z.string().max(500).optional(),
    scheduledAt: z.string().datetime().optional(),
  })
  .refine((data) => data.patientId || data.patient, {
    message: "Either patientId or patient object is required",
  });

const listQuerySchema = z.object({
  doctorId: z.string().regex(/^\d+$/).optional(),
  date: z.string().optional(),
  status: z.enum(VISIT_STATUSES).optional(),
  type: z.enum(VISIT_TYPES).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  q: z.string().optional(),
});

const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

const statusSchema = z.object({
  status: z.enum(VISIT_STATUSES),
});

const noteSchema = z.object({
  text: z.string().min(2).max(5000),
});

const prescriptionSchema = z.object({
  symptoms: z.string().max(5000).optional(),
  diagnosis: z.string().max(5000).optional(),
  advice: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  items: z
    .array(
      z.object({
        medicine: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        durationDays: z.number().int().min(1).max(365),
        instruction: z.string().optional(),
      }),
    )
    .min(1),
});

const transferToIpdSchema = z.object({
  attendingDoctorId: z.number().int().positive().optional(),
  ward: z.string().min(1).max(120),
  room: z.string().min(1).max(120),
  bed: z.string().min(1).max(120),
  diagnosis: z.string().max(5000).optional(),
  reason: z.string().max(5000).optional(),
  notes: z.string().max(1000).optional(),
  admittedAt: z.string().datetime().optional(),
});

router.use(authenticate);

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { doctorId, date, status, type, page, pageSize, q } = req.query as z.infer<typeof listQuerySchema>;
    const { skip, take, page: safePage, pageSize: safeSize } = parsePage(page, pageSize);

    const selectedDay = date ? dayjs(date) : null;
    const dayStart = selectedDay?.startOf("day").toDate();
    const dayEnd = selectedDay?.endOf("day").toDate();

    const resolvedDoctorId =
      req.user?.role === "DOCTOR" ? req.user.id : doctorId ? Number(doctorId) : undefined;

    const where = {
      doctorId: resolvedDoctorId,
      status: status ?? undefined,
      type: type ?? undefined,
      scheduledAt: dayStart && dayEnd ? { gte: dayStart, lte: dayEnd } : undefined,
      OR: q
        ? [
            { patient: { name: { contains: q } } },
            { patient: { phone: { contains: q } } },
            { patient: { mrn: { contains: q } } },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      prisma.visit.count({ where }),
      prisma.visit.findMany({
        where,
        include: {
          patient: true,
          doctor: {
            select: {
              id: true,
              name: true,
              doctorProfile: { select: { qualification: true, specialization: true } },
            },
          },
          invoice: {
            select: { id: true, invoiceNo: true, total: true, paidAmount: true, dueAmount: true },
          },
          prescription: {
            select: {
              id: true,
              visitId: true,
              createdAt: true,
              printedAt: true,
              templateType: true,
            },
          },
          ipdAdmission: true,
          opdToIpdTransfer: true,
        },
        orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
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

    const visit = await prisma.visit.findUnique({
      where: { id: Number(id) },
      include: {
        patient: true,
        doctor: {
          select: {
            id: true,
            name: true,
            doctorProfile: { select: { qualification: true, specialization: true, signaturePath: true } },
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { doctor: { select: { id: true, name: true } } },
        },
        prescription: true,
        invoice: { include: { items: true } },
        ipdAdmission: {
          include: {
            attendingDoctor: { select: { id: true, name: true } },
            transfer: true,
          },
        },
        opdToIpdTransfer: true,
      },
    });

    if (!visit) {
      throw new AppError("Visit not found", 404);
    }

    res.json({ data: visit });
  }),
);

router.post(
  "/",
  authorize("ADMIN", "RECEPTION"),
  validateBody(createVisitSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const payload = req.body as z.infer<typeof createVisitSchema>;

    const doctor = await prisma.user.findFirst({
      where: {
        id: payload.doctorId,
        role: "DOCTOR",
        active: true,
      },
    });

    if (!doctor) {
      throw new AppError("Assigned doctor not found", 400);
    }

    const settings = await prisma.hospitalSettings.findUnique({ where: { id: 1 } });
    const defaultFee = settings?.defaultConsultationFee ?? 500;

    const visit = await prisma.$transaction(async (tx: any) => {
      const patientId = payload.patientId
        ? payload.patientId
        : (
            await tx.patient.create({
              data: {
                mrn: generateMrn(),
                name: payload.patient!.name,
                age: payload.patient!.age ?? null,
                gender: payload.patient!.gender,
                phone: payload.patient!.phone,
                address: payload.patient!.address,
                idProof: payload.patient!.idProof ?? null,
                createdById: req.user?.id,
              },
            })
          ).id;

      return tx.visit.create({
        data: {
          patientId,
          doctorId: payload.doctorId,
          createdById: req.user?.id,
          type: payload.type,
          status: "SCHEDULED",
          consultationFee: payload.consultationFee ?? defaultFee,
          reason: payload.reason ?? null,
          scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : new Date(),
        },
        include: {
          patient: true,
          doctor: {
            select: {
              id: true,
              name: true,
              doctorProfile: { select: { qualification: true, specialization: true } },
            },
          },
        },
      });
    });

    res.status(201).json({ data: visit });
  }),
);

router.patch(
  "/:id/status",
  authorize("ADMIN", "RECEPTION", "DOCTOR"),
  validateParams(idParamsSchema),
  validateBody(statusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { status } = req.body as z.infer<typeof statusSchema>;

    const visit = await prisma.visit.findUnique({ where: { id: Number(id) } });
    if (!visit) {
      throw new AppError("Visit not found", 404);
    }

    if (req.user?.role === "DOCTOR" && visit.doctorId !== req.user.id) {
      throw new AppError("You can only update your own visits", 403);
    }

    const updated = await prisma.visit.update({
      where: { id: Number(id) },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    res.json({ data: updated });
  }),
);

router.post(
  "/:id/notes",
  authorize("DOCTOR"),
  validateParams(idParamsSchema),
  validateBody(noteSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { text } = req.body as z.infer<typeof noteSchema>;

    const visit = await prisma.visit.findUnique({ where: { id: Number(id) } });
    if (!visit) {
      throw new AppError("Visit not found", 404);
    }

    if (visit.doctorId !== req.user?.id) {
      throw new AppError("You can only add notes to your own visits", 403);
    }

    const doctorId = req.user?.id;
    if (!doctorId) {
      throw new AppError("Unauthorized", 401);
    }

    const note = await prisma.note.create({
      data: {
        visitId: visit.id,
        doctorId,
        text,
      },
      include: { doctor: { select: { id: true, name: true } } },
    });

    res.status(201).json({ data: note });
  }),
);

router.put(
  "/:id/prescription",
  authorize("DOCTOR"),
  validateParams(idParamsSchema),
  validateBody(prescriptionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { items, symptoms, diagnosis, advice, notes } = req.body as z.infer<typeof prescriptionSchema>;

    const visit = await prisma.visit.findUnique({
      where: { id: Number(id) },
      include: { invoice: true },
    });
    if (!visit) {
      throw new AppError("Visit not found", 404);
    }

    if (visit.doctorId !== req.user?.id) {
      throw new AppError("You can only prescribe on your own visits", 403);
    }

    if (!visit.invoice || visit.invoice.dueAmount > 0) {
      throw new AppError("Prescription is available only after consultation bill is fully paid", 400);
    }

    const doctorId = req.user?.id;
    if (!doctorId) {
      throw new AppError("Unauthorized", 401);
    }

    const prescription = await prisma.prescription.upsert({
      where: { visitId: visit.id },
      create: {
        visitId: visit.id,
        doctorId,
        symptoms: symptoms ?? null,
        diagnosis: diagnosis ?? null,
        advice: advice ?? null,
        notes: notes ?? null,
        itemsJson: JSON.stringify(items),
      },
      update: {
        symptoms: symptoms ?? null,
        diagnosis: diagnosis ?? null,
        advice: advice ?? null,
        notes: notes ?? null,
        itemsJson: JSON.stringify(items),
      },
    });

    res.json({ data: prescription });
  }),
);

router.post(
  "/:id/prescription/mark-printed",
  authorize("ADMIN", "RECEPTION", "DOCTOR"),
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const visitId = Number(id);

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { prescription: true },
    });

    if (!visit || !visit.prescription) {
      throw new AppError("Prescription not found for this visit", 404);
    }

    if (req.user?.role === "DOCTOR" && visit.doctorId !== req.user.id) {
      throw new AppError("You can only print your own prescriptions", 403);
    }

    const updated = await prisma.prescription.update({
      where: { visitId },
      data: { printedAt: new Date() },
    });

    res.json({ data: updated });
  }),
);

router.post(
  "/:id/transfer-to-ipd",
  authorize("ADMIN", "RECEPTION"),
  validateParams(idParamsSchema),
  validateBody(transferToIpdSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const payload = req.body as z.infer<typeof transferToIpdSchema>;

    const opdVisit = await prisma.visit.findUnique({
      where: { id: Number(id) },
      include: {
        patient: true,
        doctor: { select: { id: true } },
        opdToIpdTransfer: true,
      },
    });

    if (!opdVisit) {
      throw new AppError("Visit not found", 404);
    }

    if (opdVisit.type !== "OPD") {
      throw new AppError("Only OPD visits can be transferred to IPD", 400);
    }

    if (opdVisit.opdToIpdTransfer) {
      throw new AppError("This OPD visit has already been transferred to IPD", 400);
    }

    const attendingDoctorId = payload.attendingDoctorId ?? opdVisit.doctorId;

    const doctor = await prisma.user.findFirst({
      where: { id: attendingDoctorId, role: "DOCTOR", active: true },
      select: { id: true },
    });

    if (!doctor) {
      throw new AppError("Attending doctor not found", 400);
    }

    const created = await prisma.$transaction(async (tx: any) => {
      const ipdVisit = await tx.visit.create({
        data: {
          patientId: opdVisit.patientId,
          doctorId: attendingDoctorId,
          createdById: req.user?.id,
          type: "IPD",
          status: "IN_PROGRESS",
          consultationFee: 0,
          reason: payload.reason ?? opdVisit.reason ?? null,
          scheduledAt: payload.admittedAt ? new Date(payload.admittedAt) : new Date(),
        },
      });

      const admission = await tx.iPDAdmission.create({
        data: {
          visitId: ipdVisit.id,
          patientId: opdVisit.patientId,
          attendingDoctorId,
          ward: payload.ward,
          room: payload.room,
          bed: payload.bed,
          diagnosis: payload.diagnosis ?? opdVisit.reason ?? null,
          reason: payload.reason ?? opdVisit.reason ?? null,
          admittedAt: payload.admittedAt ? new Date(payload.admittedAt) : new Date(),
          createdById: req.user?.id,
        },
        include: {
          visit: true,
          patient: true,
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

      await tx.opdToIpdTransfer.create({
        data: {
          opdVisitId: opdVisit.id,
          ipdAdmissionId: admission.id,
          patientId: opdVisit.patientId,
          transferredById: req.user!.id,
          notes: payload.notes ?? null,
        },
      });

      return admission;
    });

    res.status(201).json({ data: created });
  }),
);

export const visitsRouter = router;
