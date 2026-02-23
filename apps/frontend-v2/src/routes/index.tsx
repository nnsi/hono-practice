import { createFileRoute, Navigate } from "@tanstack/react-router";

function IndexRedirect() {
  const stored = localStorage.getItem("actiko-v2-settings");
  if (stored) {
    try {
      const settings = JSON.parse(stored);
      if (settings.showGoalOnStartup) {
        return <Navigate to="/goals" />;
      }
    } catch {
      // ignore
    }
  }
  return <Navigate to="/actiko" />;
}

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});
