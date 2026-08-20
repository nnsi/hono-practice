import { DeleteConfirmDialog } from "actiko-frontend";

// DeleteConfirmDialog is a modal (ModalOverlay + card). It renders the overlay
// fixed to the viewport, so a single story is enough — it shows the confirm card
// with cancel / delete buttons over a dimmed backdrop.
export function Default() {
  return (
    <DeleteConfirmDialog
      taskTitle="週次レビューを書く"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );
}
