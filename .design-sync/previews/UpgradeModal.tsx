import { UpgradeModal } from "actiko-frontend";

// UpgradeModal is the Pro-upgrade modal (rendered via ModalOverlay): a Free vs
// Pro feature comparison, the monthly price, and the upgrade CTA. Fully
// props-driven; we render the open modal in its idle, loading, and error
// states. Full width is fine — the modal centers and caps at max-w-sm.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 460 }}>{children}</div>;
}

const noop = () => {};

export function Default() {
  return (
    <Frame>
      <UpgradeModal
        onClose={noop}
        onUpgrade={noop}
        isLoading={false}
        error={null}
      />
    </Frame>
  );
}

export function Loading() {
  return (
    <Frame>
      <UpgradeModal
        onClose={noop}
        onUpgrade={noop}
        isLoading={true}
        error={null}
      />
    </Frame>
  );
}

export function WithError() {
  return (
    <Frame>
      <UpgradeModal
        onClose={noop}
        onUpgrade={noop}
        isLoading={false}
        error={new Error("checkout failed")}
      />
    </Frame>
  );
}
