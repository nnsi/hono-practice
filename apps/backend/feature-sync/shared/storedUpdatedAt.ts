type VersionedRow = { id: string; updatedAt: Date };

/**
 * upsert が返した行の updatedAt を、NOW() への繰り上げ後に実際に保存された値へ
 * 差し替える。繰り上げ対象にならなかった行（クライアント時刻が未来の行）は
 * upsert が返した値のまま。
 */
export function withStoredUpdatedAt<T extends VersionedRow>(
  rows: T[],
  bumped: VersionedRow[],
): T[] {
  const storedById = new Map(bumped.map((row) => [row.id, row.updatedAt]));
  return rows.map((row) => {
    const updatedAt = storedById.get(row.id);
    return updatedAt ? { ...row, updatedAt } : row;
  });
}

/**
 * 受理した行と、サーバーに保存された updatedAt。クライアントは次の編集に
 * これより後の時刻を付ける（付けないと自分の直前の push に負ける）。
 */
export function toSyncedRevisions(rows: VersionedRow[]): VersionedRow[] {
  return rows.map((row) => ({ id: row.id, updatedAt: row.updatedAt }));
}
