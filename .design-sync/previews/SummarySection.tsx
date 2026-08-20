import { SummarySection } from "actiko-frontend";

// SummarySection is a 3-up grid of summary cards (total / daily average /
// recorded days). It reads i18n labels from the provided ja namespace.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-gray-50 rounded-xl border border-gray-200">
        {children}
      </div>
    </div>
  );
}

export function RunningMinutes() {
  return (
    <Frame>
      <SummarySection
        summary={{
          totalQuantity: 945,
          activeDays: 24,
          daysInMonth: 30,
          avgPerDay: 39,
        }}
        quantityUnit="分"
      />
    </Frame>
  );
}

export function ReadingPages() {
  return (
    <Frame>
      <SummarySection
        summary={{
          totalQuantity: 312,
          activeDays: 18,
          daysInMonth: 30,
          avgPerDay: 17,
        }}
        quantityUnit="ページ"
      />
    </Frame>
  );
}
