import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/task')({
  component: () => <div>Hello /task!</div>
})