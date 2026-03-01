import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../services/auth-service";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Express middleware that verifies the JWT in the Authorization header.
 * Sets req.user on success; returns 401 on failure.
 */
export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Missing or invalid Authorization header", statusCode: 401 });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token", statusCode: 401 });
    return;
  }

  req.user = payload;
  next();
}
