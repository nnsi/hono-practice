import { hc } from "hono/client";

// biome-ignore lint/style/noRestrictedImports: Hono adapter boundary intentionally depends on AppType.
import type { AppType } from "@backend/app";

import { customFetch } from "./customFetch";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

export const apiClient = hc<AppType>(API_URL, { fetch: customFetch });
export const getApiUrl = () => API_URL;
