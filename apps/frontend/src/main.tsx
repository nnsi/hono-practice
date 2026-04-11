import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import {
  setupGlobalErrorHandler,
} from "@packages/frontend-shared";
import { initI18n } from "@packages/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import "dayjs/locale/en";

import LanguageDetector from "i18next-browser-languagedetector";

import { ErrorBoundary } from "./components/root";
import { routeTree } from "./routeTree.gen";
import { reportError, webReportErrorOptions } from "./utils/errorReporter";
import "./main.css";

const router = createRouter({ routeTree });
const queryClient = new QueryClient();

setupGlobalErrorHandler((report) => reportError(report));

initI18n({
  plugins: [LanguageDetector],
  detection: {
    order: ["localStorage", "navigator"],
    lookupLocalStorage: "actiko-v2-language",
    caches: ["localStorage"],
  },
  onLanguageChanged: (lng) => dayjs.locale(lng === "ja" ? "ja" : "en"),
});

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
    <ErrorBoundary reportErrorOptions={webReportErrorOptions}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
