import { AppError } from "@backend/error";
import { isLocalOrigin } from "@backend/utils/isLocalOrigin";

export type AdminRuntimeEnvironment =
  | "development"
  | "test"
  | "stg"
  | "production";

export type AdminAuthConfig = {
  environment: AdminRuntimeEnvironment;
  googleOAuthClientId: string;
  allowedEmails: readonly string[];
};

export type AdminOriginConfig = {
  environment: AdminRuntimeEnvironment;
  adminAppUrl?: string;
};

export function parseAllowedAdminEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmailAllowed(
  email: string,
  config: Pick<AdminAuthConfig, "environment" | "allowedEmails">,
): boolean {
  if (config.environment === "development" && email === "dev@localhost") {
    return true;
  }
  return config.allowedEmails.includes(email.toLowerCase());
}

export function assertAdminOrigin(
  origin: string | undefined,
  config: AdminOriginConfig,
): void {
  if (!origin) return;
  if (
    (config.environment === "development" || config.environment === "test") &&
    isLocalOrigin(origin)
  ) {
    return;
  }
  const allowed = config.adminAppUrl
    ? [new URL(config.adminAppUrl).origin]
    : [];
  if (!URL.canParse(origin)) {
    throw new AppError("Origin not allowed", 403);
  }
  const requestOrigin = new URL(origin).origin;
  if (!allowed.includes(requestOrigin)) {
    throw new AppError("Origin not allowed", 403);
  }
}
