// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  getAllActivities: vi.fn(),
  getAllActivityKinds: vi.fn(),
  getActivityKindsByActivityId: vi.fn(),
  getAllIconBlobs: vi.fn(),
}));
vi.mock("../../repositories/activityRepository", () => ({
  activityRepository: repository,
}));
vi.mock("../../utils/errorReporter", () => ({ reportError: vi.fn() }));

import { dbEvents } from "../../db/dbEvents";
import { TaskActivityProvider } from "./TaskActivityProvider";
import type { TaskItem } from "./types";
import { useTaskCard } from "./useTaskCard";

const task: TaskItem = {
  id: "scheduled-task",
  userId: "user",
  title: "Daily task",
  memo: "",
  activityId: "activity",
  activityKindId: "kind",
  quantity: 1,
  startDate: "2026-09-30",
  dueDate: "2026-09-30",
  doneDate: null,
  archivedAt: null,
  createdAt: "2026-09-30T00:00:00Z",
  updatedAt: "2026-09-30T00:00:00Z",
};

function CardProbe() {
  const { linkedActivity, linkedKind, iconBlobMap } = useTaskCard(task, false);
  return (
    <span>
      {linkedActivity?.name}/{linkedKind?.name}/
      {iconBlobMap.get("activity")?.base64}
    </span>
  );
}

function List({ count }: { count: number }) {
  return (
    <TaskActivityProvider>
      {Array.from({ length: count }, (_, id) => `task-${id}`).map((id) => (
        <CardProbe key={id} />
      ))}
    </TaskActivityProvider>
  );
}

beforeEach(() => {
  repository.getAllActivities.mockResolvedValue([
    { id: "activity", name: "Walk" },
  ]);
  repository.getAllActivityKinds.mockResolvedValue([
    { id: "kind", activityId: "activity", name: "Outside", deletedAt: null },
  ]);
  repository.getAllIconBlobs.mockResolvedValue([
    { activityId: "activity", base64: "image", mimeType: "image/png" },
  ]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("task list activity queries", () => {
  it("8 rows share queries, and adding rows or changing tabs does not reload images", async () => {
    const view = render(<List count={8} />);
    await waitFor(() =>
      expect(view.getAllByText("Walk/Outside/image")).toHaveLength(8),
    );
    expect(repository.getAllActivities).toHaveBeenCalledTimes(1);
    expect(repository.getAllIconBlobs).toHaveBeenCalledTimes(1);
    expect(repository.getAllActivityKinds).toHaveBeenCalledTimes(1);
    expect(repository.getActivityKindsByActivityId).not.toHaveBeenCalled();

    view.rerender(<List count={0} />);
    view.rerender(<List count={12} />);
    expect(view.getAllByText("Walk/Outside/image")).toHaveLength(12);
    expect(repository.getAllActivities).toHaveBeenCalledTimes(1);
    expect(repository.getAllIconBlobs).toHaveBeenCalledTimes(1);
    expect(repository.getAllActivityKinds).toHaveBeenCalledTimes(1);

    repository.getAllActivities.mockResolvedValue([
      { id: "activity", name: "Run" },
    ]);
    repository.getAllActivityKinds.mockResolvedValue([
      { id: "kind", activityId: "activity", name: "Trail", deletedAt: null },
    ]);
    repository.getAllIconBlobs.mockResolvedValue([
      {
        activityId: "activity",
        base64: "updated-image",
        mimeType: "image/png",
      },
    ]);
    await act(async () => {
      dbEvents.emit("activities");
      dbEvents.emit("activity_kinds");
      dbEvents.emit("activity_icon_blobs");
    });
    expect(view.getAllByText("Run/Trail/updated-image")).toHaveLength(12);
    expect(repository.getAllActivities).toHaveBeenCalledTimes(2);
    expect(repository.getAllIconBlobs).toHaveBeenCalledTimes(2);
    expect(repository.getAllActivityKinds).toHaveBeenCalledTimes(2);

    view.unmount();
    act(() => {
      dbEvents.emit("activities");
      dbEvents.emit("activity_kinds");
      dbEvents.emit("activity_icon_blobs");
    });
    expect(repository.getAllActivities).toHaveBeenCalledTimes(2);
    expect(repository.getAllIconBlobs).toHaveBeenCalledTimes(2);
    expect(repository.getAllActivityKinds).toHaveBeenCalledTimes(2);
  });

  it("does not link kinds from another activity or deleted kinds", async () => {
    repository.getAllActivityKinds.mockResolvedValue([
      { id: "kind", activityId: "other", name: "Other", deletedAt: null },
      {
        id: "deleted",
        activityId: "activity",
        name: "Deleted",
        deletedAt: "2026-09-30",
      },
    ]);
    const { result, rerender } = renderHook(
      (currentTask) => useTaskCard(currentTask, false),
      { initialProps: task, wrapper: TaskActivityProvider },
    );
    await waitFor(() =>
      expect(result.current.linkedActivity?.name).toBe("Walk"),
    );
    expect(result.current.linkedKind).toBeNull();
    rerender({ ...task, activityKindId: "deleted" });
    expect(result.current.linkedKind).toBeNull();
    rerender({ ...task, activityId: null });
    expect(result.current.linkedActivity).toBeNull();
    expect(result.current.linkedKind).toBeNull();
  });
});
