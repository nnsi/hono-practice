import { useAppSettings } from "@frontend/hooks/feature/setting/useAppSettings";
import { Navigate, createFileRoute } from "@tanstack/react-router";

const IndexRedirect: React.FC = () => {
  const { settings, isLoaded } = useAppSettings();

  // 設定の読み込みが完了するまで待つ
  if (!isLoaded) {
    return null; // または適切なローディング表示
  }

  const redirectTo = settings.showGoalOnStartup ? "/new-goal" : "/actiko";
  return <Navigate to={redirectTo} />;
};

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});
