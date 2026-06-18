import { EntitlementGate } from "actiko-frontend";

// EntitlementGate wraps a Pro-only feature. For premium plans it renders its
// children; for free plans it renders the lock UI for the given feature, with
// an optional upgrade CTA. In preview the local authState is empty, so usePlan
// resolves to "free" and the locked state is shown. We vary feature + CTA.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-white rounded-xl p-2">{children}</div>
    </div>
  );
}

const noop = () => {};

export function ApiKeyLocked() {
  return (
    <Frame>
      <EntitlementGate feature="apiKey" onUpgrade={noop}>
        <div className="p-4 text-sm">API キー管理</div>
      </EntitlementGate>
    </Frame>
  );
}

export function VoiceLockedNoCta() {
  return (
    <Frame>
      <EntitlementGate feature="voice">
        <div className="p-4 text-sm">音声記録</div>
      </EntitlementGate>
    </Frame>
  );
}

export function WidgetLocked() {
  return (
    <Frame>
      <EntitlementGate feature="widget" onUpgrade={noop}>
        <div className="p-4 text-sm">ウィジェット無制限</div>
      </EntitlementGate>
    </Frame>
  );
}
