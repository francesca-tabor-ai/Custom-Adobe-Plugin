/**
 * HTTP client wrapping UXP's fetch() with auth headers, timeouts, and error handling.
 */

import { authManager } from "./auth-manager";

const DEFAULT_TIMEOUT = 15000;

let baseUrl = "http://127.0.0.1:3200";

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/$/, "");
}

export function getBaseUrl(): string {
  return baseUrl;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  timeout?: number;
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, timeout = DEFAULT_TIMEOUT, skipAuth = false } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth) {
    const token = authManager.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 304) {
      return null as T;
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        (errorBody as { message?: string }).message || response.statusText
      );
    }

    return (await response.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ApiError(0, "Request timed out");
    }
    throw new ApiError(0, (err as Error).message || "Network error");
  }
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
