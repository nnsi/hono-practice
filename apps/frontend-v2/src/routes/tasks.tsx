import { createFileRoute } from "@tanstack/react-router";
import { TasksPage } from "../components/tasks";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});
