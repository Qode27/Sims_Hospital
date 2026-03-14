import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRoleValue } from "../types/domain.js";

export type TokenPayload = {
  userId: number;
  role: UserRoleValue;
  username: string;
  sessionVersion: string;
  exp?: number;
};

export const signToken = (payload: TokenPayload) => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
};
