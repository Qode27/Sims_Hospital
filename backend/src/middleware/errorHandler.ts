import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof Error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
};
