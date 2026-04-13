import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { AdminRoot } from "../components/common/AdminRoot";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: AdminRoot,
  },
);
