import { Router } from "express";
import dayjs from "dayjs";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate, authorize, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { INVOICE_ITEM_CATEGORIES, PAYMENT_MODES } from "../../types/domain.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/appError.js";
import { parsePage } from "../../utils/pagination.js";
import { roundMoney } from "../../utils/id.js";

const router = Router();

const invoiceItemSchema = z.object({
  category: z.enum(INVOICE_ITEM_CATEGORIES).default("MISC"),
  name: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().default(0),
  tax: z.number().nonnegative().optional().default(0),
});

const createInvoiceSchema = z.object({
  visitId: z.number().int().positive(),
  items: z.array(invoiceItemSchema).min(1),
  discount: z.number().nonnegative().optional().default(0),
  tax: z.number().nonnegative().optional().default(0),
  paymentMode: z.enum(PAYMENT_MODES),
  paidAmount: z.number().nonnegative(),
  notes: z.string().max(500).optional(),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  date: z.string().optional(),
});

const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

router.use(authenticate);

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const { q, page, pageSize, date } = req.query as z.infer<typeof listQuerySchema>;
    const { skip, take, page: safePage, pageSize: safeSize } = parsePage(page, pageSize);

    const where = {
      createdAt: date
        ? {
            gte: dayjs(date).startOf("day").toDate(),
            lte: dayjs(date).endOf("day").toDate(),
          }
        : undefined,
      OR: q
        ? [
            { invoiceNo: { contains: q } },
            { visit: { patient: { name: { contains: q } } } },
            { visit: { patient: { phone: { contains: q } } } },
            { visit: { patient: { mrn: { contains: q } } } },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          prescription: { select: { id: true, visitId: true, createdAt: true, printedAt: true } },
          visit: {
            include: {
              patient: true,
              doctor: {
                select: {
                  id: true,
                  name: true,
                  doctorProfile: { select: { qualification: true, specialization: true, signaturePath: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
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

    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(id) },
      include: {
        items: true,
        prescription: true,
        visit: {
          include: {
            patient: true,
            doctor: {
              select: {
                id: true,
                name: true,
                doctorProfile: { select: { qualification: true, specialization: true, signaturePath: true } },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    const settings = await prisma.hospitalSettings.findUnique({ where: { id: 1 } });
    res.json({ data: invoice, settings });
  }),
);

router.post(
  "/",
  authorize("ADMIN", "RECEPTION"),
  validateBody(createInvoiceSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const payload = req.body as z.infer<typeof createInvoiceSchema>;

    const visit = await prisma.visit.findUnique({
      where: { id: payload.visitId },
      include: { patient: true, doctor: true, invoice: true },
    });

    if (!visit) {
      throw new AppError("Visit not found", 404);
    }

    if (visit.invoice) {
      throw new AppError("Invoice already exists for this visit", 400);
    }

    const linePreview = payload.items.map((item) => {
      const base = roundMoney(item.qty * item.unitPrice);
      const discount = roundMoney(item.discount ?? 0);
      const tax = roundMoney(item.tax ?? 0);
      const amount = roundMoney(base - discount + tax);

      if (amount < 0) {
        throw new AppError(`Invalid amount for item: ${item.name}`, 400);
      }

      return {
        ...item,
        discount,
        tax,
        amount,
        base,
      };
    });

    const subtotal = roundMoney(linePreview.reduce((sum, item) => sum + item.base, 0));
    const itemDiscountTotal = roundMoney(linePreview.reduce((sum, item) => sum + item.discount, 0));
    const itemTaxTotal = roundMoney(linePreview.reduce((sum, item) => sum + item.tax, 0));
    const invoiceDiscount = roundMoney(payload.discount ?? 0);
    const invoiceTax = roundMoney(payload.tax ?? 0);
    const discount = roundMoney(itemDiscountTotal + invoiceDiscount);
    const tax = roundMoney(itemTaxTotal + invoiceTax);
    const total = roundMoney(subtotal - discount + tax);

    if (payload.paidAmount > total) {
      throw new AppError("Paid amount cannot exceed total", 400);
    }

    const paidAmount = roundMoney(payload.paidAmount);
    const dueAmount = roundMoney(total - paidAmount);

    const invoice = await prisma.$transaction(async (tx: any) => {
      const settings =
        (await tx.hospitalSettings.findUnique({ where: { id: 1 } })) ??
        (await tx.hospitalSettings.create({
          data: {
            hospitalName: "SIMS Hospital",
            address: "Update hospital address",
            phone: "0000000000",
            invoicePrefix: "SIMS",
            invoiceSequence: 1,
            footerNote: "Thank you for choosing SIMS Hospital.",
            kansaltLogoPath: "/uploads/kansalt-full-logo.svg",
          },
        }));

      const dateCode = dayjs().format("YYYYMMDD");
      const sequence = String(settings.invoiceSequence).padStart(4, "0");
      const invoiceNo = `${settings.invoicePrefix}-${dateCode}-${sequence}`;

      const created = await tx.invoice.create({
        data: {
          visitId: payload.visitId,
          invoiceNo,
          subtotal,
          discount,
          tax,
          total,
          paymentMode: payload.paymentMode,
          paidAmount,
          dueAmount,
          notes: payload.notes ?? null,
          createdById: req.user?.id,
          items: {
            create: linePreview.map((item) => ({
              category: item.category,
              name: item.name,
              qty: item.qty,
              unitPrice: item.unitPrice,
              discount: item.discount,
              tax: item.tax,
              amount: item.amount,
            })),
          },
        },
        include: {
          items: true,
          prescription: true,
          visit: {
            include: {
              patient: true,
              doctor: {
                select: {
                  id: true,
                  name: true,
                  doctorProfile: { select: { qualification: true, specialization: true, signaturePath: true } },
                },
              },
            },
          },
        },
      });

      await tx.hospitalSettings.update({
        where: { id: 1 },
        data: { invoiceSequence: settings.invoiceSequence + 1 },
      });

      if (visit.status !== "COMPLETED") {
        await tx.visit.update({
          where: { id: visit.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }

      if (dueAmount <= 0) {
        await tx.prescription.upsert({
          where: { visitId: visit.id },
          create: {
            visitId: visit.id,
            patientId: visit.patientId,
            doctorId: visit.doctorId,
            invoiceId: created.id,
            templateType: "OP_CASE_SHEET",
            notes: payload.notes ?? null,
            itemsJson: JSON.stringify([]),
          },
          update: {
            patientId: visit.patientId,
            doctorId: visit.doctorId,
            invoiceId: created.id,
            templateType: "OP_CASE_SHEET",
            notes: payload.notes ?? undefined,
          },
        });
      }

      return created;
    });

    res.status(201).json({ data: invoice });
  }),
);

export const invoicesRouter = router;
