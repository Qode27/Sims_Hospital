import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type TokenPayload = {
  userId: number;
  role: "ADMIN" | "RECEPTION" | "DOCTOR";
  username: string;
};

export const signToken = (payload: TokenPayload) => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
};
