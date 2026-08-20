import { ScopeBadges } from "actiko-frontend";

// ScopeBadges renders a wrap of small pill badges, one per API-key scope.
// Labels come from the ja "settings" i18n namespace.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        {children}
      </div>
    </div>
  );
}

export function FullAccess() {
  return (
    <Frame>
      <ScopeBadges scopes={["all"]} />
    </Frame>
  );
}

export function ReadOnly() {
  return (
    <Frame>
      <ScopeBadges scopes={["activity-logs:read", "tasks:read"]} />
    </Frame>
  );
}

export function MixedScopes() {
  return (
    <Frame>
      <ScopeBadges
        scopes={[
          "activity-logs:read",
          "activity-logs:write",
          "tasks:read",
          "tasks:write",
          "voice",
        ]}
      />
    </Frame>
  );
}
