import { SubscriptionSection } from "actiko-frontend";

// SubscriptionSection is the "プラン" settings block. It reads useSubscription
// (react-query; provider injected) and useWebSubscriptionEnabled. In preview
// there is no live session/env flag, so it renders the loading spinner first
// and then the Free-plan state (no upgrade CTA, since web subscription is off).
// Labels come from the ja "settings" namespace.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 380 }}>
      <div className="bg-white rounded-xl p-2">{children}</div>
    </div>
  );
}

export function Default() {
  return (
    <Frame>
      <SubscriptionSection />
    </Frame>
  );
}
