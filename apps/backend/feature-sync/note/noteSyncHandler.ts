import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertNoteRequest } from "@packages/types";
import {
  GetNotesV2ResponseSchema,
  SyncNotesV2ResponseSchema,
} from "@packages/types";

import { AppError } from "../../error";
import type { NoteSyncUsecase } from "./noteSyncUsecase";

export function newNoteSyncHandler(uc: NoteSyncUsecase) {
  return {
    getNotes: getNotes(uc),
    syncNotes: syncNotes(uc),
  };
}

function getNotes(uc: NoteSyncUsecase) {
  return async (userId: UserId, since?: string) => {
    const result = await uc.getNotes(userId, since);
    const parsed = GetNotesV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse notes response", 500);
    }
    return parsed.data;
  };
}

function syncNotes(uc: NoteSyncUsecase) {
  return async (userId: UserId, noteList: UpsertNoteRequest[]) => {
    const result = await uc.syncNotes(userId, noteList);
    const parsed = SyncNotesV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse sync notes response", 500);
    }
    return parsed.data;
  };
}
