import dayjs from "dayjs";

export type NoteSection =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "older";

export const NOTE_SECTION_ORDER: NoteSection[] = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "older",
];

type GroupableNote = { updatedAt: string };

export type GroupedNotes<T extends GroupableNote> = Record<NoteSection, T[]>;

/**
 * note を更新日時に応じて以下のセクションに分類する。
 * - today: dayDiff <= 0
 * - yesterday: dayDiff === 1
 * - thisWeek: 2..6 日前
 * - thisMonth: 7..29 日前
 * - older: 30 日以上前
 *
 * 入力順は維持される（同一セクション内）。
 */
export function groupNotesByDate<T extends GroupableNote>(
  notes: T[],
  now: Date = new Date(),
): GroupedNotes<T> {
  const todayStart = dayjs(now).startOf("day");
  const grouped: GroupedNotes<T> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };

  for (const note of notes) {
    const dayDiff = todayStart.diff(
      dayjs(note.updatedAt).startOf("day"),
      "day",
    );
    if (dayDiff <= 0) grouped.today.push(note);
    else if (dayDiff === 1) grouped.yesterday.push(note);
    else if (dayDiff <= 6) grouped.thisWeek.push(note);
    else if (dayDiff <= 29) grouped.thisMonth.push(note);
    else grouped.older.push(note);
  }

  return grouped;
}
