import Dexie from "dexie";
import { describe, expect, it } from "vitest";

import { db } from "./schema";
import { registerPreviousVersions } from "./schemaVersions";

describe("Dexie version 9", () => {
  it("preserves every version 8 table and index while adding schedules", () => {
    const previous = new Dexie("previous-schema");
    registerPreviousVersions(previous);
    expect(previous.verno).toBe(8);
    expect(db.verno).toBe(9);
    for (const table of previous.tables) {
      const current = db.table(table.name).schema;
      expect(current.primKey.src).toBe(table.schema.primKey.src);
      for (const index of table.schema.indexes) {
        expect(current.indexes.map((item) => item.src)).toContain(index.src);
      }
    }
    expect(
      db.tasks.schema.idxByName["[scheduleId+scheduledDate]"].keyPath,
    ).toEqual(["scheduleId", "scheduledDate"]);
    expect(db.taskSchedules.schema.indexes.map((index) => index.name)).toEqual([
      "_syncStatus",
      "activityId",
      "updatedAt",
    ]);
  });
});
