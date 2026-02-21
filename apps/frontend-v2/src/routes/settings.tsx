import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "../components/setting";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
