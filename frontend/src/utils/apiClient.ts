import { Hono } from "hono";
import { hc } from "hono/client";

import { AppType } from "@/backend/index";

const API_URL =
  import.meta.env.MODE === "development"
    ? `http://${document.domain}:3456/`
    : import.meta.env.VITE_API_URL;

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await fetch(input, init);
  if (res.status === 204) return Response.json({});

  const json = await res.json();

  if (res.status === 401) {
    window.dispatchEvent(
      new CustomEvent("unauthorized", { detail: json.message })
    );

    if (!input.toString().includes("me")) {
      window.dispatchEvent(
        new CustomEvent("api-error", { detail: json.message })
      );
    }

    throw Error(json.message);
  }

  if (res.status === 400 || res.status > 401) {
    window.dispatchEvent(
      new CustomEvent("api-error", { detail: json.message })
    );
    throw Error(json.message);
  }

  return Response.json(json);
};

export const apiClient = hc<AppType>(API_URL, {
  init: {
    mode: "cors",
    credentials: "include",
  },
  fetch: customFetch,
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
