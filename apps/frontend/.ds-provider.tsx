// design-sync preview provider — wraps every preview card so components that
// read i18n / react-query context render real content instead of raw keys.
// Referenced from .design-sync/config.json via `provider` + `extraEntries`.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider, i18next, initI18n } from "@packages/i18n";
import type { ReactNode } from "react";

// Bundled resources → init is effectively synchronous; force Japanese so the
// cards show the product's real copy.
initI18n({ lng: "ja" });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export function DSProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18next}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
}
