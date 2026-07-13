import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { isLocalOrigin } from "@backend/utils/isLocalOrigin";

export function parseAllowedAdminEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmailAllowed(
  email: string,
  env: AppContext["Bindings"],
): boolean {
  if (env.NODE_ENV === "development" && email === "dev@localhost") return true;
  return parseAllowedAdminEmails(env.ADMIN_ALLOWED_EMAILS).includes(
    email.toLowerCase(),
  );
}

export function assertAdminOrigin(
  origin: string | undefined,
  env: AppContext["Bindings"],
): void {
  if (!origin) return;
  if (
    (env.NODE_ENV === "development" || env.NODE_ENV === "test") &&
    isLocalOrigin(origin)
  ) {
    return;
  }
  const allowed = [env.ADMIN_APP_URL, env.APP_URL, env.APP_URL_V2]
    .filter((value): value is string => Boolean(value))
    .map((value) => new URL(value).origin);
  if (!URL.canParse(origin)) {
    throw new AppError("Origin not allowed", 403);
  }
  const requestOrigin = new URL(origin).origin;
  if (!allowed.includes(requestOrigin)) {
    throw new AppError("Origin not allowed", 403);
  }
}
