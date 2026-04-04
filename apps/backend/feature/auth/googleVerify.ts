import { AuthError } from "@backend/error";
import { createRemoteJWKSet, jwtVerify } from "jose";

import type { OAuthVerify } from "./oauthVerify";
import { toOIDCPayload } from "./oauthVerify";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUER = "https://accounts.google.com";
const googleJwkSet = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export const googleVerify: OAuthVerify = async (credential, clientId) => {
  try {
    const { payload } = await jwtVerify(credential, googleJwkSet, {
      issuer: GOOGLE_ISSUER,
      audience: clientId,
      maxTokenAge: "10m",
      clockTolerance: "5m",
    });
    return toOIDCPayload(payload);
  } catch (e) {
    throw e instanceof AuthError ? e : new AuthError("Invalid token");
  }
};
