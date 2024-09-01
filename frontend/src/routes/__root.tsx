import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import { LoginForm } from "@/frontend/src/components/root/LoginForm";

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
      <div className="p-2 flex gap-2">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>
        <Link to="/about" className="[&.active]:font-bold">
          About
        </Link>
        <span onClick={handleLogout}>Logout</span>
      </div>
      <hr />
      <div className="m-5">
        <Outlet />
      </div>
    </>
  );
};

const RootComponent: React.FC = () => {
  const { user, getUser } = useAuth();

  const [isTriedAuthentication, setIsTrieduthentication] = useState(false);

  useEffect(() => {
    (async () => {
      await getUser();
      console.log("done");
      setIsTrieduthentication(true);
    })();
  }, []);

  if (!isTriedAuthentication) return <div>Loading...</div>;

  return <>{user ? <AuthenticatedHome /> : <LoginForm />}</>;
};

export const Route = createRootRoute({
  component: RootComponent,
});
