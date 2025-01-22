import { hc } from "hono/client";

import type { AppType } from "@backend/app";

const API_URL =
  import.meta.env.MODE === "development"
    ? `http://${document.domain}:3456/`
    : import.meta.env.VITE_API_URL;

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...init?.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  if (res.status === 204) return Response.json({});

  const json = await res.json();

  if (res.status === 401) {
    window.dispatchEvent(
      new CustomEvent("unauthorized", { detail: json.message }),
    );

    if (!input.toString().includes("me")) {
      window.dispatchEvent(
        new CustomEvent("api-error", { detail: json.message }),
      );
    }

    throw Error(json.message);
  }

  if (res.status === 400 || res.status > 401) {
    window.dispatchEvent(
      new CustomEvent("api-error", { detail: json.message }),
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
