import { createFileRoute } from "@tanstack/react-router";

import { ContactDetailPage } from "../components/contacts/ContactDetailPage";

export const Route = createFileRoute("/contacts_/$id")({
  component: ContactDetailPage,
});
