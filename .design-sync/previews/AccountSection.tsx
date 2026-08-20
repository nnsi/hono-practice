import { AccountSection } from "actiko-frontend";

// AccountSection takes no props — it renders the account-linking section
// (Google / Apple link rows + delete-account control). i18n labels come from
// the ja "settings" namespace. Account-link state is driven by react-query
// hooks against the API, so without a live session it shows the unlinked /
// loading layout, which is the structure we want to preview.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-white rounded-xl p-2">{children}</div>
    </div>
  );
}

export function Default() {
  return (
    <Frame>
      <AccountSection />
    </Frame>
  );
}
