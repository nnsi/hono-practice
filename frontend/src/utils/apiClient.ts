import { Hono } from "hono";
import { hc } from "hono/client";

import { AppType } from "@/backend/index";

const API_URL =
  import.meta.env.MODE === "development"
    ? `http://${document.domain}:3456/`
    : import.meta.env.VITE_API_URL;

export const apiClient = hc<AppType>(API_URL, {
  init: {
    mode: "cors",
    credentials: "include",
  },
});

type Routes = AppType extends Hono<any, infer R, any> ? R : never;

export type ApiRoutes = {
  [Path in keyof Routes]: {
    [Method in keyof Routes[Path]]: Routes[Path][Method] extends {
      input: any;
      output: any;
    }
      ? Routes[Path][Method]
      : Routes[Path][Method];
  };
};
