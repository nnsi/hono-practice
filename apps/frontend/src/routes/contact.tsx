import { createFileRoute } from "@tanstack/react-router";

import { ContactPage } from "../components/contact/ContactPage";

export const Route = createFileRoute("/contact")({
  component: () => <ContactPage />,
});
