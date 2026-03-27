import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import {
  reportError,
  setupGlobalErrorHandler,
} from "@packages/frontend-shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { ErrorBoundary } from "./components/root";
import { db } from "./db/schema";
import { routeTree } from "./routeTree.gen";
import "./main.css";

const router = createRouter({ routeTree });
const queryClient = new QueryClient();

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

let cachedUserId = "";
db.authState.get("current").then((state) => {
  cachedUserId = state?.lastLoginAt ? state.userId : "";
});
db.authState.hook("creating", (_primKey, obj) => {
  cachedUserId = obj.lastLoginAt ? obj.userId : "";
});
db.authState.hook("updating", (modifications, _primKey, obj) => {
  const merged = { ...obj, ...modifications };
  cachedUserId = merged.lastLoginAt ? merged.userId : "";
});

const reportErrorOptions = {
  apiUrl: API_URL,
  platform: "web" as const,
  getContext: () => ({
    screen: window.location.pathname,
    userId: cachedUserId || undefined,
  }),
};

setupGlobalErrorHandler((report) => reportError(report, reportErrorOptions));

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// bfcache復元時はReact内部状態が不整合になるためリロード
window.addEventListener("pageshow", (e) => {
  if (e.persisted) window.location.reload();
});

// ピンチズーム防止
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  },
  { passive: false },
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary reportErrorOptions={reportErrorOptions}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
