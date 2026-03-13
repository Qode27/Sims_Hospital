import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { logError, requestLogContext } from "../utils/logger.js";

const sendError = (res: Response, statusCode: number, message: string, code: string) =>
  res.status(statusCode).json({
    error: true,
    message,
    code,
  });

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(res, 404, "Route not found", "ROUTE_NOT_FOUND");
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    logError(error.message, {
      ...requestLogContext(req),
      code: error.code,
      statusCode: error.statusCode,
    });
    return sendError(res, error.statusCode, error.message, error.code);
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "Image size must be 3 MB or less" : error.message;
    logError(message, {
      ...requestLogContext(req),
      code: error.code,
      statusCode: 400,
    });
    return sendError(res, 400, message, "UPLOAD_ERROR");
  }

  if (error instanceof Error) {
    logError(error.message, {
      ...requestLogContext(req),
      stack: env.nodeEnv === "development" ? error.stack : undefined,
      statusCode: 500,
    });
    return sendError(
      res,
      500,
      env.nodeEnv === "development" ? error.message : "Something went wrong. Please try again shortly.",
      "INTERNAL_SERVER_ERROR",
    );
  }

  logError("Unknown error", {
    ...requestLogContext(req),
    payload: String(error),
    statusCode: 500,
  });
  return sendError(res, 500, "Internal server error", "INTERNAL_SERVER_ERROR");
};
