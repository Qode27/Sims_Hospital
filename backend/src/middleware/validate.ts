import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";

const zodErrorToMessage = (error: ZodError) =>
  error.issues.map((issue) => `${issue.path.join(".") || "field"}: ${issue.message}`).join("; ");

export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as { body: unknown }).body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: zodErrorToMessage(error) });
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as { query: unknown }).query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: zodErrorToMessage(error) });
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as { params: unknown }).params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: zodErrorToMessage(error) });
      }
      next(error);
    }
  };
};
