import { AuthError } from "@backend/error";
import { createRemoteJWKSet, jwtVerify } from "jose";

import type { OAuthVerify } from "./oauthVerify";
import { toOIDCPayload } from "./oauthVerify";

const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER = "https://appleid.apple.com";
const appleJwkSet = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

export const appleVerify: OAuthVerify = async (credential, clientId) => {
  try {
    const { payload } = await jwtVerify(credential, appleJwkSet, {
      issuer: APPLE_ISSUER,
      audience: clientId,
      maxTokenAge: "10m",
      clockTolerance: "5m",
    });
    return toOIDCPayload(payload);
  } catch (e) {
    throw e instanceof AuthError ? e : new AuthError("Invalid token");
  }
};
