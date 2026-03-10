import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate, authorize, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/appError.js";

const router = Router();

const listQuerySchema = z.object({
  patientId: z.string().regex(/^\d+$/).optional(),
  visitId: z.string().regex(/^\d+$/).optional(),
});

const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

router.use(authenticate);

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { patientId, visitId } = req.query as z.infer<typeof listQuerySchema>;

    const where = {
      patientId: patientId ? Number(patientId) : undefined,
      visitId: visitId ? Number(visitId) : undefined,
      visit: req.user?.role === "DOCTOR" ? { doctorId: req.user.id } : undefined,
    };

    const rows = await prisma.prescription.findMany({
      where,
      include: {
        patient: { select: { id: true, mrn: true, name: true, age: true, gender: true } },
        doctor: {
          select: {
            id: true,
            name: true,
            doctorProfile: { select: { qualification: true, specialization: true, signaturePath: true } },
          },
        },
        visit: { select: { id: true, scheduledAt: true, status: true, type: true } },
        invoice: { select: { id: true, invoiceNo: true, total: true, paidAmount: true, dueAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: rows });
  }),
);

router.get(
  "/:id",
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;

    const row = await prisma.prescription.findUnique({
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
        visit: true,
        invoice: true,
      },
    });

    if (!row) {
      throw new AppError("Prescription not found", 404);
    }

    if (req.user?.role === "DOCTOR" && row.doctorId !== req.user.id) {
      throw new AppError("Forbidden", 403);
    }

    res.json({ data: row });
  }),
);

router.post(
  "/:id/mark-printed",
  authorize("ADMIN", "RECEPTION", "DOCTOR"),
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const prescription = await prisma.prescription.findUnique({ where: { id: Number(id) } });

    if (!prescription) {
      throw new AppError("Prescription not found", 404);
    }

    if (req.user?.role === "DOCTOR" && prescription.doctorId !== req.user.id) {
      throw new AppError("Forbidden", 403);
    }

    const updated = await prisma.prescription.update({
      where: { id: Number(id) },
      data: { printedAt: new Date() },
    });

    res.json({ data: updated });
  }),
);

export const prescriptionsRouter = router;
