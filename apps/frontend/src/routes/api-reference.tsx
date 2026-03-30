import { createFileRoute } from "@tanstack/react-router";

import { ApiReferencePage } from "../components/api-reference/ApiReferencePage";

export const Route = createFileRoute("/api-reference")({
  component: () => <ApiReferencePage />,
});
