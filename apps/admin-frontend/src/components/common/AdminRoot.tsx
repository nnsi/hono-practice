import { Outlet } from "@tanstack/react-router";

import { useAdminAuth } from "../../hooks/useAdminAuth";
import { LoginPage } from "../login/LoginPage";
import { AdminLayout } from "./AdminLayout";

export function AdminRoot() {
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
