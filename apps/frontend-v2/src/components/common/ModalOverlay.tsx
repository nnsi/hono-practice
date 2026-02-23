type ModalOverlayProps = {
  onClose: () => void;
  children: React.ReactNode;
  centered?: boolean;
};

export function ModalOverlay({
  onClose,
  children,
  centered,
}: ModalOverlayProps) {
  return (
    <div
      className={`fixed inset-0 bg-black/50 flex ${centered ? "items-center" : "items-end sm:items-center"} justify-center z-50`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
