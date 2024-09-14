import { createFileRoute } from "@tanstack/react-router";

const ActivityModal: React.FC = () => {
  return <div>Hello ActivityModal!</div>;
};

export const Route = createFileRoute("/activity/$id")({
  component: ActivityModal,
});
