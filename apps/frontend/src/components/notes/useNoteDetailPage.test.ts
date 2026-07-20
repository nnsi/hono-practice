import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ noteId: "new" }),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: () => undefined,
}));

vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../hooks/useActivities", () => ({
  useActivities: () => ({ activities: [] }),
}));

vi.mock("../../sync/syncEngine", () => ({
  syncEngine: { syncNotes: vi.fn() },
}));

vi.mock("../../db/noteRepository", () => ({
  noteRepository: {
    createNote: vi.fn(),
    updateNote: vi.fn(),
    getNoteById: vi.fn(),
  },
}));

// Import after mocks
import { noteRepository } from "../../db/noteRepository";
import { useNoteDetailPage } from "./useNoteDetailPage";

import type { Syncable } from "@packages/domain";
import type { NoteRecord } from "@packages/domain/note/noteRecord";

function makeNote(id: string): Syncable<NoteRecord> {
  return {
    id,
    userId: "user-1",
    activityId: null,
    title: "",
    content: "",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z",
    deletedAt: null,
    _syncStatus: "pending",
  };
}

/** visibilitychange ハンドラが hidden 判定できるよう visibilityState を上書きする */
function setHidden() {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "hidden",
  });
}

describe("useNoteDetailPage の flush 直列化 (BUG-8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHidden();
  });

  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  it("新規ノートで flush が多重発火しても createNote は1回だけ呼ばれる", async () => {
    let resolveCreate!: (v: Syncable<NoteRecord>) => void;
    const createPromise = new Promise<Syncable<NoteRecord>>((resolve) => {
      resolveCreate = resolve;
    });
    vi.mocked(noteRepository.createNote).mockReturnValue(createPromise);
    vi.mocked(noteRepository.updateNote).mockResolvedValue(undefined);

    const { result, unmount } = renderHook(() => useNoteDetailPage());

    act(() => {
      result.current.setTitle("first title");
      result.current.setContent("first content");
    });

    // 1回目の flush 発火（タブを隠す）。createNote の解決前に…
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // flush() 内部の Promise チェーンが doFlush を呼び出すまでマイクロタスクを進める
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // …2回目の flush が発火する（多重発火のシミュレーション）
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // createNote はまだ1回しか呼ばれていないはず（直列化により2回目は
    // 1回目の完了を待ってから doFlush を実行する）
    expect(noteRepository.createNote).toHaveBeenCalledTimes(1);

    // createNote 解決前にさらに入力が進む
    act(() => {
      result.current.setContent("final content");
    });

    await act(async () => {
      resolveCreate(makeNote("note-1"));
      // createNote 解決後のチェーン継続（2回目の flush = doFlush 実行）を
      // マイクロタスクキューが進むまで待つ
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // createNote は依然として1回だけ（重複作成されていない）
    expect(noteRepository.createNote).toHaveBeenCalledTimes(1);
    // チェーンされた2回目の flush が updateNote で最終入力を永続化する
    expect(noteRepository.updateNote).toHaveBeenCalled();
    const lastUpdateCall = vi
      .mocked(noteRepository.updateNote)
      .mock.calls.at(-1);
    expect(lastUpdateCall?.[0]).toBe("note-1");
    expect(lastUpdateCall?.[1]).toMatchObject({ content: "final content" });

    unmount();
  });

  it("flush 完了前に戻る操作をしても createNote は1回だけ呼ばれ、最終入力が保存される", async () => {
    vi.mocked(noteRepository.createNote).mockResolvedValue(makeNote("note-2"));
    vi.mocked(noteRepository.updateNote).mockResolvedValue(undefined);

    const { result, unmount } = renderHook(() => useNoteDetailPage());

    act(() => {
      result.current.setTitle("title");
      result.current.setContent("content A");
    });

    const backPromise1 = act(async () => {
      await result.current.handleBack();
    });

    act(() => {
      result.current.setContent("content B");
    });

    const backPromise2 = act(async () => {
      await result.current.handleBack();
    });

    await Promise.all([backPromise1, backPromise2]);

    expect(noteRepository.createNote).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith({ to: "/notes" });

    unmount();
  });
});
