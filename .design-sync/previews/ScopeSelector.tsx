import { ScopeSelector } from "actiko-frontend";

// ScopeSelector is the scope-picker used inside the create-API-key form. The
// "すべての権限" checkbox grants full access and disables the granular rows;
// otherwise individual read/write/voice scopes are toggled. Labels come from
// the ja "settings" namespace. Props-driven (selectedScopes + onChange).
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 320 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        {children}
      </div>
    </div>
  );
}

const noop = () => {};

export function AllScopes() {
  return (
    <Frame>
      <ScopeSelector selectedScopes={["all"]} onChange={noop} />
    </Frame>
  );
}

export function GranularSelection() {
  return (
    <Frame>
      <ScopeSelector
        selectedScopes={["activity-logs:read", "tasks:write"]}
        onChange={noop}
      />
    </Frame>
  );
}

export function NoneSelected() {
  return (
    <Frame>
      <ScopeSelector selectedScopes={[]} onChange={noop} />
    </Frame>
  );
}
