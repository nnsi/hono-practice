import { describe, expect, it } from "vitest";

import { decodeWebhookSecret, verifyPolarSignature } from "../polarSignature";

// Test secret (base64-encoded 32-byte key)
const TEST_SECRET_RAW = "dGVzdC1zZWNyZXQtZm9yLXVuaXQtdGVzdHMtMTIzNA==";
const TEST_SECRET = `whsec_${TEST_SECRET_RAW}`;

async function signPayload(
  msgId: string,
  timestamp: string,
  body: string,
  secret: string,
): Promise<string> {
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const binary = atob(raw);
  const keyBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    keyBytes[i] = binary.charCodeAt(i);
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${msgId}.${timestamp}.${body}`),
  );
  const bytes = new Uint8Array(signed);
  let bin = "";
  for (const byte of bytes) {
    bin += String.fromCharCode(byte);
  }
  return btoa(bin);
}

describe("decodeWebhookSecret", () => {
  it("strips whsec_ prefix and base64-decodes", () => {
    const result = decodeWebhookSecret(TEST_SECRET);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("works without whsec_ prefix", () => {
    const result = decodeWebhookSecret(TEST_SECRET_RAW);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns same bytes with or without prefix", () => {
    const withPrefix = decodeWebhookSecret(TEST_SECRET);
    const withoutPrefix = decodeWebhookSecret(TEST_SECRET_RAW);
    expect(withPrefix).toEqual(withoutPrefix);
  });
});

describe("verifyPolarSignature", () => {
  const msgId = "msg_test123";
  const body = '{"type":"subscription.created","data":{}}';

  it("accepts a valid signature", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = await signPayload(msgId, ts, body, TEST_SECRET);

    const result = await verifyPolarSignature(
      body,
      msgId,
      ts,
      `v1,${sig}`,
      TEST_SECRET,
    );
    expect(result).toBe(true);
  });

  it("rejects an invalid signature", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const result = await verifyPolarSignature(
      body,
      msgId,
      ts,
      "v1,aW52YWxpZHNpZw==",
      TEST_SECRET,
    );
    expect(result).toBe(false);
  });

  it("rejects an expired timestamp", async () => {
    const oldTs = String(Math.floor(Date.now() / 1000) - 600);
    const sig = await signPayload(msgId, oldTs, body, TEST_SECRET);

    const result = await verifyPolarSignature(
      body,
      msgId,
      oldTs,
      `v1,${sig}`,
      TEST_SECRET,
    );
    expect(result).toBe(false);
  });

  it("rejects a future timestamp beyond tolerance", async () => {
    const futureTs = String(Math.floor(Date.now() / 1000) + 600);
    const sig = await signPayload(msgId, futureTs, body, TEST_SECRET);

    const result = await verifyPolarSignature(
      body,
      msgId,
      futureTs,
      `v1,${sig}`,
      TEST_SECRET,
    );
    expect(result).toBe(false);
  });

  it("rejects non-numeric timestamp", async () => {
    const result = await verifyPolarSignature(
      body,
      msgId,
      "notanumber",
      "v1,dGVzdA==",
      TEST_SECRET,
    );
    expect(result).toBe(false);
  });

  it("rejects empty signature header", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const result = await verifyPolarSignature(body, msgId, ts, "", TEST_SECRET);
    expect(result).toBe(false);
  });

  it("rejects signature without v1 prefix", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = await signPayload(msgId, ts, body, TEST_SECRET);
    const result = await verifyPolarSignature(
      body,
      msgId,
      ts,
      sig,
      TEST_SECRET,
    );
    expect(result).toBe(false);
  });

  it("accepts when one of multiple signatures is valid", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = await signPayload(msgId, ts, body, TEST_SECRET);

    const result = await verifyPolarSignature(
      body,
      msgId,
      ts,
      `v1,aW52YWxpZA== v1,${sig}`,
      TEST_SECRET,
    );
    expect(result).toBe(true);
  });
});
