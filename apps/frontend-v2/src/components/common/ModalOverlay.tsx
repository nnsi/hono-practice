type ModalOverlayProps = {
  onClose: () => void;
  children: React.ReactNode;
};

export function ModalOverlay({
  onClose,
  children,
}: ModalOverlayProps) {
  return (
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
