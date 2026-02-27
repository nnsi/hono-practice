import { useEffect, useRef } from "react";
import { createUseSyncEngine } from "@packages/frontend-shared/hooks/useSyncEngine";
import { syncEngine } from "../sync/syncEngine";

const useSyncEngineShared = createUseSyncEngine({ useEffect, useRef });

export function useSyncEngine(isLoggedIn: boolean) {
  useSyncEngineShared(syncEngine, isLoggedIn);
}
