import { Button } from "@frontend/components/ui";
import { useAuth } from "@frontend/hooks/useAuth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

// https://github.com/orgs/honojs/discussions/3222

export const App: React.FC = () => {
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

  return <Button onClick={handleLogout}>Logout</Button>;
};

export const Route = createFileRoute("/")({
  component: App,
});
