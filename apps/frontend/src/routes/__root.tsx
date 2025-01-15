import { useEffect, useState } from "react";


import { CreateUserForm } from "@frontend/components/root/CreateUserForm";
import { LoginForm } from "@frontend/components/root/LoginForm";
import { useAuth } from "@frontend/hooks/useAuth";
import {
  Link,
  Outlet,
  createRootRoute,
  useNavigate,
} from "@tanstack/react-router";

import { Button, Toaster, useToast } from "@components/ui";

// ログイン済みユーザー向けのルートコンポーネント
const AuthenticatedHome: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate({
        to: "/",
      });
    } catch (e) {
      console.error("Root", e);
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
        <Link to="/goal" className="[&.active]:font-bold">
          Goal
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

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    function handleApiError(e: CustomEvent<string>) {
      toast({
        title: "Error",
        description: e.detail,
        variant: "destructive",
      });
    }
    function handleUnauthorized() {
      navigate({
        to: "/",
      });
    }
    window.addEventListener("api-error", handleApiError);
    window.addEventListener("unauthorized", handleUnauthorized);
    (async () => {
      await getUser();
      setIsTrieduthentication(true);
    })();

    return () => {
      window.removeEventListener("api-error", handleApiError);
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, []);

  if (!isTriedAuthentication) return <div>Loading...</div>;

  return (
    <>
      {user ? (
        <AuthenticatedHome />
      ) : (
        <>
          <div className="h-svh flex items-center justify-center gap-5">
            <LoginForm />
            <p> or </p>
            <CreateUserForm />
          </div>
          <Toaster />
        </>
      )}
    </>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
