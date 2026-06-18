import { ApiKeyList } from "actiko-frontend";

// ApiKeyList is fully props-driven: it renders a list of issued API keys with
// masked key text, scope badges, and created/last-used dates. Each row has an
// inline two-step delete control. Labels come from the ja "settings" namespace.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 380 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        {children}
      </div>
    </div>
  );
}

const noop = async () => {};

export function WithKeys() {
  return (
    <Frame>
      <ApiKeyList
        isLoading={false}
        onDelete={noop}
        apiKeys={[
          {
            id: "key_1",
            name: "iPhone ショートカット",
            key: "********...9f2a",
            scopes: ["all"],
            lastUsedAt: "2024-05-14T08:30:00.000Z",
            isActive: true,
            createdAt: "2024-04-02T10:00:00.000Z",
            updatedAt: "2024-05-14T08:30:00.000Z",
          },
          {
            id: "key_2",
            name: "記録ボット（読み取り専用）",
            key: "********...4c81",
            scopes: ["activity-logs:read", "tasks:read"],
            lastUsedAt: null,
            isActive: true,
            createdAt: "2024-05-01T09:15:00.000Z",
            updatedAt: "2024-05-01T09:15:00.000Z",
          },
        ]}
      />
    </Frame>
  );
}

export function Loading() {
  return (
    <Frame>
      <ApiKeyList isLoading={true} onDelete={noop} apiKeys={[]} />
    </Frame>
  );
}

export function Empty() {
  return (
    <Frame>
      <ApiKeyList isLoading={false} onDelete={noop} apiKeys={[]} />
    </Frame>
  );
}
