import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { getDashboardSnapshot, getOperationalReports } from "../../services/reports.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

const querySchema = z.object({
  date: z.string().optional(),
});

router.use(authenticate);

router.get(
  "/dashboard",
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { date } = req.query as z.infer<typeof querySchema>;
    const data = await getDashboardSnapshot(date);
    res.json({ data });
  }),
);

router.get(
  "/analytics",
  authorize("ADMIN", "RECEPTION", "DOCTOR", "BILLING", "PHARMACY", "LAB_TECHNICIAN"),
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { date } = req.query as z.infer<typeof querySchema>;
    const data = await getOperationalReports(date);
    res.json({ data });
  }),
);

export const reportsRouter = router;
