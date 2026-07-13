import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/contacts")({
  component: lazyRouteComponent(
    () => import("../components/contacts/ContactsPage"),
    "ContactsPage",
  ),
});
