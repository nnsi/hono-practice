import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "../components/common/LegalPage";

export const Route = createFileRoute("/tokushoho")({
  component: () => <LegalPage type="tokushoho" />,
});
