import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenPayload {
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Validate credentials against the allowed users list + shared secret (v1 auth).
 * Returns the user info if valid, null otherwise.
 */
export function validateCredentials(
  email: string,
  password: string
): { email: string; name: string } | null {
  const normalizedEmail = email.toLowerCase().trim();

  if (!config.allowedUsers.includes(normalizedEmail)) {
    return null;
  }

  if (password !== config.sharedSecret) {
    return null;
  }

  // Derive display name from email (before @)
  const name = normalizedEmail.split("@")[0].replace(/[._-]/g, " ");

  return { email: normalizedEmail, name };
}

/** Sign a JWT with the user's identity. */
export function signToken(user: { email: string; name: string }): {
  token: string;
  expiresAt: string;
} {
  const expiresInSeconds = config.jwtExpiryMinutes * 60;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const token = jwt.sign(
    { email: user.email, name: user.name } satisfies TokenPayload,
    config.jwtSecret,
    { expiresIn: expiresInSeconds }
  );

  return { token, expiresAt };
}

/** Verify and decode a JWT. Returns the payload or null if invalid/expired. */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
