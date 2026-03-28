import type { UserId } from "@packages/domain/user/userSchema";
import type { ContactRequest } from "@packages/types/request";

import type { ContactUsecase } from "./contactUsecase";

export function newContactHandler(uc: ContactUsecase) {
  return {
    createContact: async (
      params: ContactRequest,
      ipAddress: string,
      userId?: UserId,
    ) => {
      await uc.createContact(params, ipAddress, userId);
    },
  };
}
