import { AppError, AuthError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import type { Provider } from "@packages/domain/auth/userProviderSchema";

import type { OAuthVerifierMap } from "./authUsecaseTypes";
import type { OIDCPayload } from "./oauthVerify";

export async function verifyProviderIdentity(
  provider: Provider,
  credential: string,
  clientId: string | string[],
  oauthVerifiers: OAuthVerifierMap,
  tracer: Tracer,
): Promise<OIDCPayload & { sub: string; email: string }> {
  const verifier = oauthVerifiers[provider];
  if (!verifier) throw new AppError("未対応のプロバイダーです", 400);
  const payload = await tracer.span(`ext.${provider}.verify`, () =>
    verifier(credential, clientId),
  );
  if (!payload.sub) throw new AuthError("Missing 'sub' in token payload");
  if (!payload.email) throw new AuthError("Missing 'email' in token payload");
  return { ...payload, sub: payload.sub, email: payload.email };
}
