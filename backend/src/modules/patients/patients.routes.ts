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

const normalizeName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const findDuplicatePatient = async (
  payload: z.infer<typeof patientSchema>,
  excludeId?: number,
) => {
  const normalizedName = normalizeName(payload.name);
  const normalizedPhone = normalizePhone(payload.phone);

  const candidates = await prisma.patient.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      active: true,
      OR: [
        { phone: { contains: normalizedPhone.slice(-10) } },
        { name: { contains: payload.name.trim() } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      dob: true,
      age: true,
      gender: true,
    },
    take: 10,
  });

  return candidates.find((candidate) => {
    const samePhone = normalizePhone(candidate.phone) === normalizedPhone;
    const sameName = normalizeName(candidate.name) === normalizedName;
    const sameGender = candidate.gender === payload.gender;
    const sameAge =
      payload.age === undefined || payload.age === null || candidate.age === null ? true : candidate.age === payload.age;

    return samePhone && sameName && sameGender && sameAge;
  });
};

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
      throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
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
    const duplicate = await findDuplicatePatient(payload);
    if (duplicate) {
      throw new AppError("A matching patient record already exists", 409, "DUPLICATE_PATIENT");
    }

    const patient = await prisma.patient.create({
      data: {
        mrn: generateMrn(),
        name: payload.name.trim().replace(/\s+/g, " "),
        dob: payload.dob ? new Date(payload.dob) : null,
        age: payload.age ?? null,
        gender: payload.gender,
        phone: normalizePhone(payload.phone),
        address: payload.address.trim(),
        idProof: payload.idProof?.trim() ?? null,
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
    const patientId = Number(id);

    const existing = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!existing) {
      throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
    }

    const duplicate = await findDuplicatePatient(payload, patientId);
    if (duplicate) {
      throw new AppError("A matching patient record already exists", 409, "DUPLICATE_PATIENT");
    }

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        name: payload.name.trim().replace(/\s+/g, " "),
        dob: payload.dob ? new Date(payload.dob) : null,
        age: payload.age ?? null,
        gender: payload.gender,
        phone: normalizePhone(payload.phone),
        address: payload.address.trim(),
        idProof: payload.idProof?.trim() ?? null,
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
      throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
    }

    const patient = await prisma.patient.update({
      where: { id: Number(id) },
      data: { active: false },
    });

    res.json({ data: patient, message: "Patient deleted" });
  }),
);

export const patientsRouter = router;
