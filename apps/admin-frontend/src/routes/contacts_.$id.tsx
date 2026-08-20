import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/contacts_/$id")({
  component: lazyRouteComponent(
    () => import("../components/contacts/ContactDetailPage"),
    "ContactDetailPage",
  ),
});
