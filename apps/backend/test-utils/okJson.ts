/**
 * @hono/zod-validator 0.8 以降、バリデーション失敗(400)レスポンスが
 * ルート型に含まれるため、testClient の res.json() は
 * `ZodSafeParseError<...> | 成功ボディ` の union になる。
 * status 400 を除外して成功ボディの型に絞るテスト用ヘルパー。
 */
export function assertNotValidationError<R extends { status: number }>(
  res: R,
): asserts res is Exclude<R, { status: 400 }> {
  if (res.status === 400) {
    throw new Error("unexpected validation error response (status 400)");
  }
}

export async function okJson<
  R extends { status: number; json(): Promise<unknown> },
>(res: R): Promise<Awaited<ReturnType<Exclude<R, { status: 400 }>["json"]>>>;
export async function okJson(res: {
  status: number;
  json(): Promise<unknown>;
}): Promise<unknown> {
  assertNotValidationError(res);
  return await res.json();
}
