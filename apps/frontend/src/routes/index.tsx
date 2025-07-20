import { useAppSettings } from "@frontend/hooks/feature/setting/useAppSettings";
import { Navigate, createFileRoute } from "@tanstack/react-router";

const IndexRedirect: React.FC = () => {
  const { settings } = useAppSettings();
  const redirectTo = settings.showGoalOnStartup ? "/new-goal" : "/actiko";
  return <Navigate to={redirectTo} />;
};

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});
