import { Router } from "express";
import { authenticate, authorize, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createVisit,
  getVisitById,
  listVisits,
  markVisitPrescriptionPrinted,
  saveVisitPrescription,
  transferOpdVisitToIpd,
  updateVisitStatus,
  addVisitNote,
} from "./visits.service.js";
import {
  createVisitSchema,
  idParamsSchema,
  listQuerySchema,
  noteSchema,
  prescriptionSchema,
  statusSchema,
  transferToIpdSchema,
  type CreateVisitInput,
  type TransferToIpdInput,
  type VisitListQuery,
  type VisitNoteInput,
  type VisitPrescriptionInput,
  type VisitStatusInput,
} from "./visits.validation.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await listVisits(req.query as VisitListQuery, req.user);
    res.json(result);
  }),
);

router.get(
  "/:id",
  validateParams(idParamsSchema),
  asyncHandler(async (req, res) => {
    const visit = await getVisitById(Number((req.params as { id: string }).id));
    res.json({ data: visit });
  }),
);

router.post(
  "/",
  authorize("ADMIN", "RECEPTION"),
  validateBody(createVisitSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const visit = await createVisit(req.body as CreateVisitInput, req);
    res.status(201).json({ data: visit });
  }),
);

router.patch(
  "/:id/status",
  authorize("ADMIN", "RECEPTION", "DOCTOR"),
  validateParams(idParamsSchema),
  validateBody(statusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await updateVisitStatus(
      Number((req.params as { id: string }).id),
      (req.body as VisitStatusInput).status,
      req,
    );
    res.json({ data: updated });
  }),
);

router.post(
  "/:id/notes",
  authorize("DOCTOR"),
  validateParams(idParamsSchema),
  validateBody(noteSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const note = await addVisitNote(Number((req.params as { id: string }).id), req.body as VisitNoteInput, req);
    res.status(201).json({ data: note });
  }),
);

router.put(
  "/:id/prescription",
  authorize("DOCTOR"),
  validateParams(idParamsSchema),
  validateBody(prescriptionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const prescription = await saveVisitPrescription(
      Number((req.params as { id: string }).id),
      req.body as VisitPrescriptionInput,
      req,
    );
    res.json({ data: prescription });
  }),
);

router.post(
  "/:id/prescription/mark-printed",
  authorize("ADMIN", "RECEPTION", "DOCTOR"),
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await markVisitPrescriptionPrinted(Number((req.params as { id: string }).id), req);
    res.json({ data: updated });
  }),
);

router.post(
  "/:id/transfer-to-ipd",
  authorize("ADMIN", "RECEPTION"),
  validateParams(idParamsSchema),
  validateBody(transferToIpdSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const created = await transferOpdVisitToIpd(
      Number((req.params as { id: string }).id),
      req.body as TransferToIpdInput,
      req,
    );
    res.status(201).json({ data: created });
  }),
);

export const visitsRouter = router;
