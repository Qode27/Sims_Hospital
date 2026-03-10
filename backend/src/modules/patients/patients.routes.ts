import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate, authorize, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { GENDERS } from "../../types/domain.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/appError.js";
import { generateMrn } from "../../utils/id.js";
import { parsePage } from "../../utils/pagination.js";

const router = Router();

const patientSchema = z.object({
  name: z.string().min(2),
  dob: z.string().datetime().optional().nullable(),
  age: z.number().int().min(0).max(130).optional().nullable(),
  gender: z.enum(GENDERS),
  phone: z.string().min(7).max(15),
  address: z.string().min(2),
  idProof: z.string().max(100).optional().nullable(),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
});

const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

router.use(authenticate);

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const { q, page, pageSize, active } = req.query as z.infer<typeof listQuerySchema>;
    const { skip, take, page: safePage, pageSize: safeSize } = parsePage(page, pageSize);

    const where = {
      active: active === undefined ? undefined : active === "true",
      OR: q
        ? [
            { name: { contains: q } },
            { phone: { contains: q } },
            { mrn: { contains: q } },
            { idProof: { contains: q } },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, username: true } },
        },
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

    const patient = await prisma.patient.findUnique({
      where: { id: Number(id) },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        visits: {
          orderBy: { createdAt: "desc" },
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                doctorProfile: { select: { qualification: true, specialization: true, signaturePath: true } },
              },
            },
            notes: { orderBy: { createdAt: "desc" } },
            prescription: true,
            invoice: { include: { items: true } },
            ipdAdmission: {
              include: {
                attendingDoctor: {
                  select: {
                    id: true,
                    name: true,
                    doctorProfile: { select: { qualification: true, specialization: true } },
                  },
                },
                transfer: true,
              },
            },
            opdToIpdTransfer: true,
          },
        },
        ipdAdmissions: {
          orderBy: { admittedAt: "desc" },
          include: {
            visit: true,
            attendingDoctor: { select: { id: true, name: true } },
            transfer: true,
          },
        },
        prescriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                doctorProfile: { select: { qualification: true, specialization: true } },
              },
            },
            visit: { select: { id: true, scheduledAt: true, status: true, type: true } },
            invoice: { select: { id: true, invoiceNo: true, dueAmount: true } },
          },
        },
      },
    });

    if (!patient) {
      throw new AppError("Patient not found", 404);
    }

    res.json({ data: patient });
  }),
);

router.post(
  "/",
  authorize("ADMIN", "RECEPTION"),
  validateBody(patientSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const payload = req.body as z.infer<typeof patientSchema>;

    const patient = await prisma.patient.create({
      data: {
        mrn: generateMrn(),
        name: payload.name,
        dob: payload.dob ? new Date(payload.dob) : null,
        age: payload.age ?? null,
        gender: payload.gender,
        phone: payload.phone,
        address: payload.address,
        idProof: payload.idProof ?? null,
        createdById: req.user?.id,
      },
    });

    res.status(201).json({ data: patient });
  }),
);

router.put(
  "/:id",
  authorize("ADMIN", "RECEPTION"),
  validateParams(idParamsSchema),
  validateBody(patientSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const payload = req.body as z.infer<typeof patientSchema>;

    const existing = await prisma.patient.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      throw new AppError("Patient not found", 404);
    }

    const patient = await prisma.patient.update({
      where: { id: Number(id) },
      data: {
        name: payload.name,
        dob: payload.dob ? new Date(payload.dob) : null,
        age: payload.age ?? null,
        gender: payload.gender,
        phone: payload.phone,
        address: payload.address,
        idProof: payload.idProof ?? null,
      },
    });

    res.json({ data: patient });
  }),
);

router.delete(
  "/:id",
  authorize("ADMIN", "RECEPTION"),
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;

    const existing = await prisma.patient.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      throw new AppError("Patient not found", 404);
    }

    const patient = await prisma.patient.update({
      where: { id: Number(id) },
      data: { active: false },
    });

    res.json({ data: patient, message: "Patient archived" });
  }),
);

export const patientsRouter = router;
