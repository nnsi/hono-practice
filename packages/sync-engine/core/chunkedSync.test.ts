import { describe, it, expect } from "vitest";
import { chunkArray, mergeSyncResults } from "./chunkedSync";

describe("chunkArray", () => {
  it("returns empty array for empty input", () => {
    const chunks = chunkArray([]);
    expect(chunks).toEqual([]);
  });

  it("returns single chunk when items <= size", () => {
    const items = [1, 2, 3];
    const chunks = chunkArray(items);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual([1, 2, 3]);
  });

  it("splits into multiple chunks", () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    const chunks = chunkArray(items);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });

  it("respects custom chunk size", () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    const chunks = chunkArray(items, 3);
    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toEqual([0, 1, 2]);
    expect(chunks[1]).toEqual([3, 4, 5]);
    expect(chunks[2]).toEqual([6, 7, 8]);
    expect(chunks[3]).toHaveLength(1);
    expect(chunks[3]).toEqual([9]);
  });
});

describe("mergeSyncResults", () => {
  it("merges multiple SyncResults", () => {
    const results = [
      { syncedIds: ["a", "b"], serverWins: [{ id: "x" }], skippedIds: ["s1"] },
      { syncedIds: ["c"], serverWins: [], skippedIds: ["s2"] },
    ];
    const merged = mergeSyncResults(results as any);
    expect(merged.syncedIds).toEqual(["a", "b", "c"]);
    expect(merged.serverWins).toEqual([{ id: "x" }]);
    expect(merged.skippedIds).toEqual(["s1", "s2"]);
  });

  it("handles empty array", () => {
    const merged = mergeSyncResults([]);
    expect(merged).toEqual({ syncedIds: [], serverWins: [], skippedIds: [] });
  });
});
