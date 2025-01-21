import { createFileRoute } from "@tanstack/react-router";

const GoalPage: React.FC = () => {
  return <div>mada</div>;
};

export const Route = createFileRoute("/goal")({
  component: GoalPage,
});
