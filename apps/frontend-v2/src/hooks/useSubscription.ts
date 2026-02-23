import { apiClient } from "../utils/apiClient";
import { createUseSubscription } from "@packages/frontend-shared/hooks/useSubscription";

export function useSubscription() {
  return createUseSubscription({ apiClient });
}
