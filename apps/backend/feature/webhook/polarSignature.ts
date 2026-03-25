const TIMESTAMP_TOLERANCE_SEC = 300;

function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigA = await crypto.subtle.sign("HMAC", key, encoder.encode(a));
  const sigB = await crypto.subtle.sign("HMAC", key, encoder.encode(b));
  const arrA = new Uint8Array(sigA);
  const arrB = new Uint8Array(sigB);
  let diff = 0;
  for (let i = 0; i < arrA.length; i++) {
    diff |= arrA[i] ^ arrB[i];
  }
  return diff === 0 && a.length === b.length;
}

async function computeHmacBase64(
  payload: string,
  secretBytes: Uint8Array,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64Encode(signed);
}

/** Strip `whsec_` prefix and base64-decode the Polar webhook secret. */
export function decodeWebhookSecret(secret: string): Uint8Array {
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  return base64Decode(raw);
}

/**
 * Verify a Standard Webhooks signature.
 *
 * Header format: `v1,<base64sig>` (space-separated if multiple).
 * Signed message: `${webhookId}.${timestamp}.${body}`
 */
export async function verifyPolarSignature(
  rawBody: string,
  webhookId: string,
  timestamp: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const ts = Number.parseInt(timestamp, 10);
  if (Number.isNaN(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TIMESTAMP_TOLERANCE_SEC) return false;

  const secretBytes = decodeWebhookSecret(secret);
  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
  const expected = await computeHmacBase64(signedPayload, secretBytes);

  const signatures = signatureHeader
    .split(" ")
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));

  if (signatures.length === 0) return false;

  for (const sig of signatures) {
    if (await timingSafeEqual(expected, sig)) return true;
  }
  return false;
}
