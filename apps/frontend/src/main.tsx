import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import "../main.css";
import { useAuth } from "@hooks/useAuth";

import { AuthProvider } from "./providers/AuthProvider";
import { TokenProvider } from "./providers/TokenProvider";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const router = createRouter({
  routeTree: routeTree,
  context: { auth: undefined! },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

declare global {
  interface WindowEventMap {
    "api-error": CustomEvent<string>;
    unauthorized: CustomEvent<string>;
    "token-refreshed": CustomEvent<string>;
    "token-refresh-needed": Event;
  }
}

const RouterProviderWithAuth: React.FC = () => {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
};

// TODO: https://tanstack.com/query/v4/docs/framework/react/plugins/createAsyncStoragePersister

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <TokenProvider>
          <AuthProvider>
            <RouterProviderWithAuth />
          </AuthProvider>
        </TokenProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
