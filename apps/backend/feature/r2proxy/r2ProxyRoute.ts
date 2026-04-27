import { noopTracer } from "@backend/lib/tracer";

import { newHonoWithErrorHandling } from "../../lib/honoWithErrorHandling";

export const r2ProxyRoute = newHonoWithErrorHandling();

const ALLOWED_KEY_PATTERN = /^(?:uploads\/)?icons\/[a-zA-Z0-9/_\-.]+\.(?:webp|png|jpe?g|gif)$/;
const INVALID_KEY_PATTERN = /\.\.|\\|%2e|[\u0000-\u001F\u007F]/i;

function inferImageContentTypeFromKey(key: string): string | null {
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".gif")) return "image/gif";
  return null;
}

r2ProxyRoute.get("/:key{.+}", async (c) => {
  const bucket = c.env.R2_BUCKET;
  if (!bucket) {
    return c.text("R2 bucket not configured", 500);
  }

  const key = c.req.param("key");
  if (INVALID_KEY_PATTERN.test(key) || !ALLOWED_KEY_PATTERN.test(key)) {
    return c.text("Invalid key", 400);
  }

  // R2から画像を取得
  const tracer = c.get("tracer") ?? noopTracer;
  const object = await tracer.span("r2.get", () => bucket.get(key));

  if (!object) {
    return c.text("Not Found", 404);
  }

  const contentType =
    object.httpMetadata?.contentType ?? inferImageContentTypeFromKey(key);
  if (!contentType || !contentType.startsWith("image/")) {
    return c.text("Unsupported content type", 415);
  }

  // キャッシュ制御ヘッダーを設定
  c.header("Cache-Control", "public, max-age=3600");
  c.header("Content-Type", contentType);
  c.header("X-Content-Type-Options", "nosniff");

  // オブジェクトの本体を返す
  const arrayBuffer = await object.arrayBuffer();
  return c.body(arrayBuffer);
});
