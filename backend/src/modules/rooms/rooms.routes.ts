import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

const querySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
});

router.use(authenticate);

router.get(
  "/",
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { active } = req.query as z.infer<typeof querySchema>;
    const rows = await prisma.room.findMany({
      where: {
        active: active === undefined ? undefined : active === "true",
      },
      include: {
        beds: {
          where: {
            active: true,
          },
          orderBy: { bedNumber: "asc" },
        },
      },
      orderBy: [{ ward: "asc" }, { name: "asc" }],
    });

    res.json({ data: rows });
  }),
);

export const roomsRouter = router;
