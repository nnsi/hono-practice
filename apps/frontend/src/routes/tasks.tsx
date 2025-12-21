import { TasksPage } from "@components/tasks";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});
