import { CreateApiKeyDialog } from "actiko-frontend";

// CreateApiKeyDialog is a modal (rendered via ModalOverlay) for issuing a new
// API key: a name field, the ScopeSelector, and a submit button. It is shown
// open here. The post-create "copy your key" state lives behind a successful
// onCreate; we render the initial form state. Labels come from the ja
// "settings" namespace. Full width is fine — the modal centers itself.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 460 }}>{children}</div>;
}

const noop = () => {};

export function Default() {
  return (
    <Frame>
      <CreateApiKeyDialog
        onClose={noop}
        onCreate={async () => ({
          apiKey: {
            id: "key_new",
            name: "新しいキー",
            key: "api_live_8f2a9c4b7e1d6035",
            scopes: ["all"],
            lastUsedAt: null,
            isActive: true,
            createdAt: "2024-05-15T00:00:00.000Z",
            updatedAt: "2024-05-15T00:00:00.000Z",
          },
        })}
      />
    </Frame>
  );
}
