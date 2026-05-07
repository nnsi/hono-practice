import { describe, expect, it, vi } from "vitest";

import { parseResponses } from "./parseResponses";

function okResponse(data: unknown) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(data),
  };
}

function failResponse() {
  return {
    ok: false,
    json: vi.fn().mockResolvedValue({}),
  };
}

function makeBaseResponses() {
  return {
    activitiesRes: okResponse({ activities: [], activityKinds: [] }),
    logsRes: okResponse({ logs: [] }),
    goalsRes: okResponse({ goals: [] }),
    tasksRes: okResponse({ tasks: [] }),
  };
}

describe("parseResponses — freezePeriodsRes handling", () => {
  it("null freezePeriodsRes does not set allSynced=false (watermark advances)", async () => {
    const base = makeBaseResponses();
    const result = await parseResponses(
      base.activitiesRes,
      base.logsRes,
      base.goalsRes,
      null,
      base.tasksRes,
    );
    expect(result.allSynced).toBe(true);
    expect(result.data.freezePeriods).toEqual([]);
  });

  it("failed freezePeriodsRes (ok=false, non-null) sets allSynced=false", async () => {
    const base = makeBaseResponses();
    const result = await parseResponses(
      base.activitiesRes,
      base.logsRes,
      base.goalsRes,
      failResponse(),
      base.tasksRes,
    );
    expect(result.allSynced).toBe(false);
  });

  it("successful freezePeriodsRes sets allSynced=true and parses data", async () => {
    const base = makeBaseResponses();
    const freezePeriod = {
      id: "fp-1",
      goal_id: "goal-1",
      user_id: "user-1",
      start_date: "2026-01-01",
      end_date: "2026-01-07",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const result = await parseResponses(
      base.activitiesRes,
      base.logsRes,
      base.goalsRes,
      okResponse({ freezePeriods: [freezePeriod] }),
      base.tasksRes,
    );
    expect(result.allSynced).toBe(true);
    expect(result.data.freezePeriods).toHaveLength(1);
    expect(result.data.freezePeriods[0].id).toBe("fp-1");
  });
});

describe("parseResponses — notesRes handling (regression parity)", () => {
  it("null notesRes does not set allSynced=false", async () => {
    const base = makeBaseResponses();
    const result = await parseResponses(
      base.activitiesRes,
      base.logsRes,
      base.goalsRes,
      okResponse({ freezePeriods: [] }),
      base.tasksRes,
      null,
    );
    expect(result.allSynced).toBe(true);
  });

  it("undefined notesRes does not set allSynced=false", async () => {
    const base = makeBaseResponses();
    const result = await parseResponses(
      base.activitiesRes,
      base.logsRes,
      base.goalsRes,
      okResponse({ freezePeriods: [] }),
      base.tasksRes,
      undefined,
    );
    expect(result.allSynced).toBe(true);
  });

  it("failed notesRes (ok=false, non-null) sets allSynced=false", async () => {
    const base = makeBaseResponses();
    const result = await parseResponses(
      base.activitiesRes,
      base.logsRes,
      base.goalsRes,
      okResponse({ freezePeriods: [] }),
      base.tasksRes,
      failResponse(),
    );
    expect(result.allSynced).toBe(false);
  });

  it("successful notesRes with notes maps data.notes via mapApiNote", async () => {
    const base = makeBaseResponses();
    const note = {
      id: "note-1",
      user_id: "user-1",
      activity_id: null,
      title: "My Note",
      content: "Some content",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    };
    const result = await parseResponses(
      base.activitiesRes,
      base.logsRes,
      base.goalsRes,
      okResponse({ freezePeriods: [] }),
      base.tasksRes,
      okResponse({ notes: [note] }),
    );
    expect(result.allSynced).toBe(true);
    expect(result.data.notes).toHaveLength(1);
    expect(result.data.notes[0].id).toBe("note-1");
    expect(result.data.notes[0].userId).toBe("user-1");
    expect(result.data.notes[0].title).toBe("My Note");
  });

  it("successful notesRes with empty notes array yields empty data.notes", async () => {
    const base = makeBaseResponses();
    const result = await parseResponses(
      base.activitiesRes,
      base.logsRes,
      base.goalsRes,
      okResponse({ freezePeriods: [] }),
      base.tasksRes,
      okResponse({ notes: [] }),
    );
    expect(result.allSynced).toBe(true);
    expect(result.data.notes).toEqual([]);
  });
});
