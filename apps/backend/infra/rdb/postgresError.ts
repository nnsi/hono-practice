/**
 * drizzle-orm はドライバのエラーを DrizzleQueryError の cause に包むため、
 * PostgreSQL のエラーコード・制約名は cause チェーンを辿って判定する。
 */
function findPostgresError(
  error: unknown,
  predicate: (candidate: Record<string, unknown>) => boolean,
): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if (predicate(current as Record<string, unknown>)) return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

export function hasPostgresErrorCode(error: unknown, code: string): boolean {
  return findPostgresError(error, (candidate) => candidate.code === code);
}

export function isPostgresUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  return findPostgresError(
    error,
    (candidate) =>
      candidate.code === "23505" &&
      (constraint === undefined || candidate.constraint === constraint),
  );
}
