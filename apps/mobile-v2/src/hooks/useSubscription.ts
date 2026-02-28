import { apiClient } from "../utils/apiClient";
import {
  type UseSubscriptionOptions,
  createUseSubscription,
} from "@packages/frontend-shared/hooks/useSubscription";

export function useSubscription() {
  return createUseSubscription({ apiClient } as UseSubscriptionOptions);
}
