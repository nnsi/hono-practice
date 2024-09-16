import { useEffect, useState } from "react";

import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

import { CreateUserForm } from "@/frontend/src/components/root/CreateUserForm";
import { LoginForm } from "@/frontend/src/components/root/LoginForm";
import { useAuth } from "@/frontend/src/hooks/useAuth";

import { Button, Toaster } from "@components/ui";

// ログイン済みユーザー向けのルートコンポーネント
const AuthenticatedHome: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="p-2 flex items-center gap-2">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>
        <Link to="/task" className="[&.active]:font-bold">
          Task
        </Link>
        <Link to="/activity" className="[&.active]:font-bold">
          Activity
        </Link>
        <Button onClick={handleLogout} className="ml-auto">
          Logout
        </Button>
      </div>
      <hr />
      <div className="m-5">
        <Outlet />
      </div>
      <Toaster />
    </>
  );
};

const RootComponent: React.FC = () => {
  const { user, getUser } = useAuth();

  const [isTriedAuthentication, setIsTrieduthentication] = useState(false);

  useEffect(() => {
    (async () => {
      await getUser();
      setIsTrieduthentication(true);
    })();
  }, []);

  if (!isTriedAuthentication) return <div>Loading...</div>;

  return (
    <>
      {user ? (
        <AuthenticatedHome />
      ) : (
        <div className="h-svh flex items-center justify-center gap-5">
          <LoginForm />
          <p> or </p>
          <CreateUserForm />
        </div>
      )}
    </>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
