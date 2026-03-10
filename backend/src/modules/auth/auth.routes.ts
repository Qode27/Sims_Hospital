import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/appError.js";
import { signToken } from "../../utils/jwt.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z
    .string()
    .min(10)
    .regex(/[A-Z]/, "New password must include one uppercase letter")
    .regex(/[a-z]/, "New password must include one lowercase letter")
    .regex(/[0-9]/, "New password must include one number")
    .regex(/[^A-Za-z0-9]/, "New password must include one special character"),
});

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.active) {
      throw new AppError("Invalid credentials", 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      username: user.username,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        forcePasswordChange: user.forcePasswordChange,
      },
    });
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  }),
);

router.post(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const { oldPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.active) {
      throw new AppError("User not found", 404);
    }

    const oldPasswordValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!oldPasswordValid) {
      throw new AppError("Old password is incorrect", 400);
    }

    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        forcePasswordChange: false,
      },
    });

    res.json({ message: "Password updated successfully" });
  }),
);

export const authRouter = router;
