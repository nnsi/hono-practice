import { createFileRoute } from "@tanstack/react-router";
import { ActikoPage } from "../components/ActikoPage";
import { LoginForm } from "../components/LoginForm";
import { useAuth } from "../hooks/useAuth";
import { useSyncEngine } from "../hooks/useSyncEngine";

function ActikoRoute() {
  const { isLoggedIn, isLoading, login, logout } = useAuth();

  useSyncEngine(isLoggedIn);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm onLogin={login} />;
  }

  return <ActikoPage onLogout={logout} />;
}

export const Route = createFileRoute("/actiko")({
  component: ActikoRoute,
});
