import { createFileRoute } from "@tanstack/react-router";
import { ActikoPage } from "../components/ActikoPage";

export const Route = createFileRoute("/actiko")({
  component: ActikoPage,
});
