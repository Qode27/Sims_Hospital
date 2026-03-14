import { Router } from "express";
import { authenticate, authorize, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createAdmission, dischargeAdmission, getAdmissionById, listAdmissions, updateAdmission } from "./ipd.service.js";
import {
  createAdmissionSchema,
  dischargeSchema,
  idParamsSchema,
  listQuerySchema,
  updateAdmissionSchema,
  type CreateAdmissionInput,
  type DischargeAdmissionInput,
  type IpdListQuery,
  type UpdateAdmissionInput,
} from "./ipd.validation.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await listAdmissions(req.query as IpdListQuery, req.user);
    res.json(result);
  }),
);

router.get(
  "/:id",
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const admission = await getAdmissionById(Number((req.params as { id: string }).id));
    res.json({ data: admission });
  }),
);

router.post(
  "/",
  authorize("ADMIN", "RECEPTION"),
  validateBody(createAdmissionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const created = await createAdmission(req.body as CreateAdmissionInput, req);
    res.status(201).json({ data: created });
  }),
);

router.patch(
  "/:id",
  authorize("ADMIN", "RECEPTION"),
  validateParams(idParamsSchema),
  validateBody(updateAdmissionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await updateAdmission(
      Number((req.params as { id: string }).id),
      req.body as UpdateAdmissionInput,
      req,
    );
    res.json({ data: updated });
  }),
);

router.post(
  "/:id/discharge",
  authorize("ADMIN", "RECEPTION", "DOCTOR"),
  validateParams(idParamsSchema),
  validateBody(dischargeSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await dischargeAdmission(
      Number((req.params as { id: string }).id),
      req.body as DischargeAdmissionInput,
      req,
    );
    res.json({ data: updated });
  }),
);

export const ipdRouter = router;
