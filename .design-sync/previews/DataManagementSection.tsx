import { DataManagementSection } from "actiko-frontend";

// DataManagementSection is the "データ管理" settings block: CSV import/export
// buttons, plus inline two-step confirmations for deleting local data and a
// full reset. It takes no props and reads only i18n (ja "settings" namespace);
// the CSV modals stay closed until their buttons are pressed, so the default
// section structure renders directly.
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
      <DataManagementSection />
    </Frame>
  );
}
