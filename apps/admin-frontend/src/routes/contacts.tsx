import { createFileRoute } from "@tanstack/react-router";

import { ContactsPage } from "../components/contacts/ContactsPage";

export const Route = createFileRoute("/contacts")({
  component: ContactsPage,
});
