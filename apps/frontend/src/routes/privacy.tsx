import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "../components/common/LegalPage";

export const Route = createFileRoute("/privacy")({
  component: () => <LegalPage type="privacy" />,
});
