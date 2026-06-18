import { TabCustomizationSection } from "actiko-frontend";

// TabCustomizationSection lets users reorder/hide bottom-nav tabs via drag rows.
// It takes no props and reads the local tab-preference store, which falls back
// to the default tab set (Actiko / Daily / Stats / Goal / Tasks / Notes) when
// nothing is stored — so the default visible-tab list renders directly. Labels
// come from the ja "settings" namespace.
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
      <TabCustomizationSection />
    </Frame>
  );
}
