/**
 * Timing-safe string comparison using HMAC-SHA256.
 *
 * Returns false immediately when lengths differ (length is not secret).
 * When lengths match, uses a random ephemeral HMAC key so that byte-by-byte
 * timing differences in the final XOR loop do not leak string content.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
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
  return diff === 0;
}
