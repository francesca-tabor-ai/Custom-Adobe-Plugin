import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[error]", err.message);

  res.status(500).json({
    error: "internal_error",
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    statusCode: 500,
  });
}
