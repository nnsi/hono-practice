/**
 * sync リクエスト内で同一 id が重複していないかを配列レベルで検証する。
 * 同一 id を 2 件含むと ON CONFLICT DO UPDATE が同じ行に二重発火し
 * Postgres が 500 を返すため、Zod 段階で 400 に倒す。
 * envelope (unknown[]) にも使えるよう、string の id を持つ要素だけを数える。
 * Postgres の uuid 型は大文字小文字を区別しないため、小文字に揃えて比較する。
 */
export function hasUniqueIds(rows: readonly unknown[]): boolean {
  const ids: string[] = [];
  for (const row of rows) {
    if (
      row &&
      typeof row === "object" &&
      "id" in row &&
      typeof row.id === "string"
    ) {
      ids.push(row.id.toLowerCase());
    }
  }
  return new Set(ids).size === ids.length;
}
