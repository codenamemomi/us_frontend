const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class BrowserApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API request failed with status ${status}`);
    this.name = "BrowserApiError";
  }
}

export async function browserApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = document.cookie.split("; ").find((item) => item.startsWith("access_token="))?.split("=")[1];
  if (token) headers.set("Authorization", `Bearer ${decodeURIComponent(token)}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
      document.cookie = "access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
      window.location.href = "/login";
    }
    throw new BrowserApiError(response.status, body);
  }
  return body as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof BrowserApiError) {
    if (typeof error.body === "string" && error.body) {
      return error.body;
    }
    if (error.body && typeof error.body === "object") {
      const b = error.body as { detail?: unknown; message?: unknown };
      if (typeof b.detail === "string") {
        return b.detail;
      }
      if (Array.isArray(b.detail)) {
        return b.detail
          .map((item: { loc?: (string | number)[]; msg?: string }) => {
            const field = item.loc && item.loc.length > 0 ? item.loc[item.loc.length - 1] : "";
            const msg = item.msg ?? "Invalid value";
            return field ? `${field}: ${msg}` : msg;
          })
          .join(", ");
      }
      if (typeof b.message === "string") {
        return b.message;
      }
    }
    if (error.status === 401) {
      return "Invalid email or password";
    }
    return `Request failed with status ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

export function getFieldErrors(error: unknown): Record<string, string> {
  const fields: Record<string, string> = {};
  if (error instanceof BrowserApiError && error.body && typeof error.body === "object") {
    const b = error.body as { detail?: unknown };
    if (Array.isArray(b.detail)) {
      for (const item of b.detail) {
        if (item.loc && item.loc.length > 0) {
          const field = String(item.loc[item.loc.length - 1]);
          if (!fields[field]) {
            fields[field] = item.msg || "Invalid value";
          }
        }
      }
    }
  }
  return fields;
}

export const browserApiClient = {
  get: <T>(path: string) => browserApi<T>(path),
  post: <T>(path: string, body?: unknown) => browserApi<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => browserApi<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => browserApi<T>(path, { method: "DELETE" }),
};

