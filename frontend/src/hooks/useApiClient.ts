import { Hono } from "hono";
import { hc } from "hono/client";

import { AppType } from "@/backend/index";

const API_URL =
  import.meta.env.MODE === "development"
    ? `http://${document.domain}:3456/`
    : import.meta.env.VITE_API_URL;

export function useApiClient() {
  return hc<AppType>(API_URL, {
    init: {
      mode: "cors",
      credentials: "include",
    },
  });
}

export type ApiRouteBase = {
  [Path in keyof (AppType extends Hono<any, infer R, any> ? R : never)]: {
    [Method in
      | "$get"
      | "$post"
      | "$put"
      | "$delete"
      | "$patch"]: Method extends keyof (AppType extends Hono<any, infer R, any>
      ? R
      : never)[Path]
      ? (AppType extends Hono<any, infer R, any>
          ? R
          : never)[Path][Method] extends { input: any; output: any }
        ? (AppType extends Hono<any, infer R, any>
            ? R
            : never)[Path][Method]["output"]
        : (AppType extends Hono<any, infer R, any> ? R : never)[Path][Method]
      : never;
  };
};
