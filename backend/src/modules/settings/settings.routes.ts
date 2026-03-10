import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

fs.mkdirSync(env.uploadDirPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDirPath),
  filename: (_req, file, cb) => {
    const ext = file.originalname.includes(".") ? file.originalname.slice(file.originalname.lastIndexOf(".")) : ".png";
    const safeName = `logo-${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
});

const settingsSchema = z.object({
  hospitalName: z.string().min(2),
  address: z.string().min(2),
  phone: z.string().min(7).max(20),
  gstin: z.string().max(30).optional().nullable(),
  defaultConsultationFee: z.number().nonnegative(),
  invoicePrefix: z.string().min(2).max(12),
  invoiceSequence: z.number().int().min(1),
  footerNote: z.string().max(300).optional().nullable(),
  kansaltLogoPath: z.string().max(300).optional().nullable(),
});

router.get(
  "/public",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.hospitalSettings.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        hospitalName: true,
        logoPath: true,
        kansaltLogoPath: true,
      },
    });

    res.json({ data: settings });
  }),
);

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings =
      (await prisma.hospitalSettings.findUnique({ where: { id: 1 } })) ??
      (await prisma.hospitalSettings.create({
        data: {
          hospitalName: "SIMS Hospital",
          address: "Update hospital address",
          phone: "0000000000",
          invoicePrefix: "SIMS",
          defaultConsultationFee: 500,
          footerNote: "Thank you for choosing SIMS Hospital.",
          kansaltLogoPath: "/uploads/kansalt-full-logo.svg",
        },
      }));

    res.json({ data: settings });
  }),
);

router.put(
  "/",
  authorize("ADMIN"),
  validateBody(settingsSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof settingsSchema>;

    const settings = await prisma.hospitalSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        hospitalName: payload.hospitalName,
        address: payload.address,
        phone: payload.phone,
        gstin: payload.gstin ?? null,
        defaultConsultationFee: payload.defaultConsultationFee,
        invoicePrefix: payload.invoicePrefix,
        invoiceSequence: payload.invoiceSequence,
        footerNote: payload.footerNote ?? null,
        kansaltLogoPath: payload.kansaltLogoPath ?? null,
      },
      update: {
        hospitalName: payload.hospitalName,
        address: payload.address,
        phone: payload.phone,
        gstin: payload.gstin ?? null,
        defaultConsultationFee: payload.defaultConsultationFee,
        invoicePrefix: payload.invoicePrefix,
        invoiceSequence: payload.invoiceSequence,
        footerNote: payload.footerNote ?? null,
        kansaltLogoPath: payload.kansaltLogoPath ?? null,
      },
    });

    res.json({ data: settings });
  }),
);

router.post(
  "/kansalt-logo",
  authorize("ADMIN"),
  upload.single("logo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "Logo file is required" });
      return;
    }

    const kansaltLogoPath = `/${env.uploadUrlPath}/${req.file.filename}`.replace(/\\/g, "/");

    const settings = await prisma.hospitalSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        hospitalName: "SIMS Hospital",
        address: "Update hospital address",
        phone: "0000000000",
        invoicePrefix: "SIMS",
        defaultConsultationFee: 500,
        footerNote: "Thank you for choosing SIMS Hospital.",
        kansaltLogoPath,
      },
      update: {
        kansaltLogoPath,
      },
    });

    res.json({ data: settings });
  }),
);

router.post(
  "/logo",
  authorize("ADMIN"),
  upload.single("logo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "Logo file is required" });
      return;
    }

    const logoPath = `/${env.uploadUrlPath}/${req.file.filename}`.replace(/\\/g, "/");

    const settings = await prisma.hospitalSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        hospitalName: "SIMS Hospital",
        address: "Update hospital address",
        phone: "0000000000",
        invoicePrefix: "SIMS",
        defaultConsultationFee: 500,
        footerNote: "Thank you for choosing SIMS Hospital.",
        kansaltLogoPath: "/uploads/kansalt-full-logo.svg",
        logoPath,
      },
      update: {
        logoPath,
      },
    });

    res.json({ data: settings });
  }),
);

export const settingsRouter = router;
