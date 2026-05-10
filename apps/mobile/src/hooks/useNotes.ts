import { useLiveQuery } from "../db/useLiveQuery";
import { noteRepository } from "../repositories/noteRepository";

export function useActiveNotes() {
  const notes = useLiveQuery("notes", async () => {
    return noteRepository.getAllActiveNotes();
  });
  return { notes: notes ?? [], isReady: notes !== undefined };
}
