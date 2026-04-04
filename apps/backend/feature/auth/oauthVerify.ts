import { AuthError } from "@backend/error";
import type { JWTPayload } from "jose";

// OIDC IDトークン標準クレーム型
export type OIDCPayload = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

// OAuth/OIDCトークン検証関数の型
export type OAuthVerify = (
  credential: string,
  clientId: string | string[],
) => Promise<OIDCPayload>;

export function toOIDCPayload(payload: JWTPayload): OIDCPayload {
  if (
    !payload.iss ||
    !payload.sub ||
    !payload.aud ||
    !payload.exp ||
    !payload.iat
  ) {
    throw new AuthError("Invalid OIDC payload: missing required claims");
  }
  return {
    iss: payload.iss,
    sub: payload.sub,
    aud: Array.isArray(payload.aud) ? payload.aud[0] : payload.aud,
    exp: payload.exp,
    iat: payload.iat,
    email: typeof payload.email === "string" ? payload.email : undefined,
    email_verified:
      typeof payload.email_verified === "boolean"
        ? payload.email_verified
        : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}
