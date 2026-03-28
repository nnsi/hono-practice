import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import { AdminLayout } from "../components/common/AdminLayout";
import { LoginPage } from "../components/login/LoginPage";
import { useAdminAuth } from "../hooks/useAdminAuth";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootComponent,
  },
);

function RootComponent() {
  const auth = useAdminAuth();

  if (auth.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!auth.isLoggedIn) {
    return <LoginPage auth={auth} />;
  }

  return (
    <AdminLayout user={auth.user} onLogout={auth.logout}>
      <Outlet />
    </AdminLayout>
  );
}
