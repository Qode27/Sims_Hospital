import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import type { UserRoleValue } from "../types/domain.js";
import { verifyToken } from "../utils/jwt.js";

export type AuthenticatedUser = {
  id: number;
  role: UserRoleValue;
  username: string;
  name: string;
  forcePasswordChange: boolean;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.slice("Bearer ".length);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, username: true, name: true, active: true, forcePasswordChange: true },
    });

    if (!user || !user.active) {
      return res.status(401).json({ message: "User account is inactive" });
    }

    req.user = {
      id: user.id,
      role: user.role as UserRoleValue,
      username: user.username,
      name: user.name,
      forcePasswordChange: user.forcePasswordChange,
    };
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (...roles: UserRoleValue[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};
