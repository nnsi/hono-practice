import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-sqlite", () => ({}));
vi.mock("../db/database", () => ({
  getDatabase: vi.fn(),
}));
vi.mock("../db/dbEvents", () => ({
  dbEvents: { emit: vi.fn(), subscribe: vi.fn() },
}));

import type { Mock } from "vitest";

import { getDatabase } from "../db/database";
import { createMobileAuthStateRepository } from "./mobileAuthStateRepository";

const mockGetDatabase = getDatabase as Mock;

// SQLite を in-memory な単一行で表現する mock。auth_state テーブルは常に id='current'
// の 1 行のみという前提を反映する
function createMockDb() {
  const row: Record<string, string | null> = {
    id: "current",
    user_id: null,
    last_login_at: null,
    plan: "free",
    tutorial_status: null,
  };
  let rowExists = false;
  return {
    runAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT OR IGNORE")) {
        rowExists = true;
        return;
      }
      const match = sql.match(
        /UPDATE auth_state SET (user_id|last_login_at|plan|tutorial_status) = \?/,
      );
      if (match) {
        const col = match[1];
        row[col] = (params?.[0] as string | null) ?? null;
      }
    }),
    getFirstAsync: vi.fn(async () => (rowExists ? { ...row } : null)),
    getAllAsync: vi.fn().mockResolvedValue([]),
    execAsync: vi.fn().mockResolvedValue(undefined),
    _row: row,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mobileAuthStateRepository", () => {
  it("並列で setUserId / setPlan / setLastLoginAt を呼んでも全カラムが正しく書かれる", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);
    const repo = createMobileAuthStateRepository();

    await Promise.all([
      repo.setUserId("user-123"),
      repo.setPlan("premium"),
      repo.setLastLoginAt("2026-05-14T10:00:00Z"),
    ]);

    expect(mockDb._row.user_id).toBe("user-123");
    expect(mockDb._row.plan).toBe("premium");
    expect(mockDb._row.last_login_at).toBe("2026-05-14T10:00:00Z");
  });

  it("setTutorialStatus は tutorial_status カラムのみを更新する", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);
    const repo = createMobileAuthStateRepository();

    await repo.setUserId("user-1");
    await repo.setTutorialStatus("pending");

    expect(mockDb._row.user_id).toBe("user-1");
    expect(mockDb._row.tutorial_status).toBe("pending");
    expect(mockDb._row.plan).toBe("free");
  });

  it("clearLastLoginAt は last_login_at を空文字にする", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);
    const repo = createMobileAuthStateRepository();

    await repo.setLastLoginAt("2026-05-14T10:00:00Z");
    await repo.clearLastLoginAt();

    expect(mockDb._row.last_login_at).toBe("");
  });

  it("行が未作成の状態で getCurrentUserId / getLastLoginAt を呼ぶと null を返す", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);
    const repo = createMobileAuthStateRepository();

    expect(await repo.getCurrentUserId()).toBeNull();
    expect(await repo.getLastLoginAt()).toBeNull();
  });

  it("setUserId 後の getCurrentUserId は永続化された値を返す", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);
    const repo = createMobileAuthStateRepository();

    await repo.setUserId("user-xyz");

    expect(await repo.getCurrentUserId()).toBe("user-xyz");
  });
});
