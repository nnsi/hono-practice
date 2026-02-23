import { createFileRoute } from "@tanstack/react-router";
import { ActikoPage } from "../components/actiko";

export const Route = createFileRoute("/actiko")({
  component: ActikoPage,
});
