import { hc } from "hono/client";
import { AppType } from "@/backend/index";

export function useApiClient() {
  return hc<AppType>("http://localhost:3456/");
}
