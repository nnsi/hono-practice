import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  component: lazyRouteComponent(
    () => import("../components/contact/ContactPage"),
    "ContactPage",
  ),
});
