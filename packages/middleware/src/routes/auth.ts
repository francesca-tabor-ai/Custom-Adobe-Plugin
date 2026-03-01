import { Router, type Request, type Response } from "express";
import { validateCredentials, signToken, verifyToken } from "../services/auth-service";
import { authGuard } from "../middleware/auth-guard";

const router = Router();

/** POST /auth/login — authenticate with email + shared secret, receive JWT */
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      error: "bad_request",
      message: "email and password are required",
      statusCode: 400,
    });
    return;
  }

  const user = validateCredentials(email, password);
  if (!user) {
    res.status(401).json({
      error: "unauthorized",
      message: "Invalid credentials",
      statusCode: 401,
    });
    return;
  }

  const { token, expiresAt } = signToken(user);

  res.json({ token, expiresAt, user });
});

/** POST /auth/refresh — exchange a valid JWT for a fresh one */
router.post("/refresh", authGuard, (req: Request, res: Response) => {
  const user = req.user!;
  const { token, expiresAt } = signToken({ email: user.email, name: user.name });

  res.json({ token, expiresAt });
});

export default router;
