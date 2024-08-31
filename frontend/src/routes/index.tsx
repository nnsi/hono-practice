import { createFileRoute } from "@tanstack/react-router";

// https://github.com/orgs/honojs/discussions/3222

export const App: React.FC = () => {
  return <>index page</>;
};

export const Route = createFileRoute("/")({
  component: App,
});
