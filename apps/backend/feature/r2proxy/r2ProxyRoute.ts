import { noopTracer } from "@backend/lib/tracer";

import { newHonoWithErrorHandling } from "../../lib/honoWithErrorHandling";

export const r2ProxyRoute = newHonoWithErrorHandling();

r2ProxyRoute.get("/:key{.+}", async (c) => {
  const bucket = c.env.R2_BUCKET;
  if (!bucket) {
    return c.text("R2 bucket not configured", 500);
  }

  const key = c.req.param("key");

  // R2から画像を取得
  const tracer = c.get("tracer") ?? noopTracer;
  const object = await tracer.span("r2.get", () => bucket.get(key));

  if (!object) {
    return c.text("Not Found", 404);
  }

  // キャッシュ制御ヘッダーを設定
  c.header("Cache-Control", "public, max-age=3600");
  c.header(
    "Content-Type",
    object.httpMetadata?.contentType || "application/octet-stream",
  );

  // オブジェクトの本体を返す
  const arrayBuffer = await object.arrayBuffer();
  return c.body(arrayBuffer);
});
