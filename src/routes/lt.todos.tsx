import { createFileRoute, redirect } from "@tanstack/react-router";

// To-dos were removed from the app; old links land on the dashboard.
export const Route = createFileRoute("/lt/todos")({
  beforeLoad: () => {
    throw redirect({ to: "/lt/dashboard" });
  },
});
