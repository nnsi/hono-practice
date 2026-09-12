// The operation nonce is a secret. Only its hash belongs in the database;
// neither the nonce nor the derived refresh secret belongs in diagnostics.
const encoder = new TextEncoder();
const algorithm = { name: "HMAC", hash: "SHA-256" };

async function hmac(key: Uint8Array<ArrayBuffer>, value: string) {
  const imported = await crypto.subtle.importKey("raw", key, algorithm, false, [
    "sign",
  ]);
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", imported, encoder.encode(value)),
  );
}

export async function deriveRefreshOperationSecret(
  jwtSecret: string,
  operationId: string,
  childSelector: string,
): Promise<string> {
  const key = await hmac(
    encoder.encode(jwtSecret),
    "actiko/refresh-operation/key/v1",
  );
  const secret = await hmac(
    key,
    `actiko/refresh-operation/child/v1\n${operationId}\n${childSelector}`,
  );
  return Array.from(secret, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
