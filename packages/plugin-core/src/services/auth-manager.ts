/**
 * Manages JWT storage and session lifecycle using UXP's localStorage.
 */

const TOKEN_KEY = "brand_sync_token";
const USER_KEY = "brand_sync_user";
const EXPIRY_KEY = "brand_sync_token_expiry";

export interface UserInfo {
  email: string;
  name: string;
}

class AuthManager {
  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);

    if (!token || !expiry) return null;

    // Check if token is expired
    if (new Date(expiry) <= new Date()) {
      this.clear();
      return null;
    }

    return token;
  }

  getUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  save(token: string, expiresAt: string, user: UserInfo): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, expiresAt);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export const authManager = new AuthManager();
