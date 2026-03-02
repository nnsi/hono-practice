import {
  type UseSubscriptionOptions,
  createUseSubscription,
} from "@packages/frontend-shared/hooks/useSubscription";

import { apiClient } from "../utils/apiClient";

export function useSubscription() {
  return createUseSubscription({ apiClient } as UseSubscriptionOptions);
}
