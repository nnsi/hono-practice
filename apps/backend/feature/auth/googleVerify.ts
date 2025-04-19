import { AuthError } from "@backend/error";
import { createRemoteJWKSet, jwtVerify } from "jose";

import type { OAuthVerify, OIDCPayload } from "./oauthVerify";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUER = "https://accounts.google.com";
const googleJwkSet = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export const googleVerify: OAuthVerify = async (credential, clientId) => {
  try {
    const { payload } = await jwtVerify(credential, googleJwkSet, {
      issuer: GOOGLE_ISSUER,
      audience: clientId,
      maxTokenAge: "10m",
    });
    return payload as OIDCPayload;
  } catch (error) {
    throw new AuthError("Invalid token");
  }
};
