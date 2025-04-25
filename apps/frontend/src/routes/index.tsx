import { createFileRoute } from "@tanstack/react-router";

import { NewActivityRegistPage } from "@components/newActivity";

export const Route = createFileRoute("/")({
  component: NewActivityRegistPage,
});
