import { createFileRoute } from "@tanstack/react-router";
import { TasksPage } from "../components/TasksPage";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});
