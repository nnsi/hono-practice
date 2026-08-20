import { CalendarGrid } from "actiko-frontend";
import dayjs from "dayjs";

// 月カレンダーの表示部分（純粋なプレゼンテーション）。
// セルは親（CalendarPopover）が組み立てて渡す。ここでは 2024年5月の
// 6週ぶんのセルを手組みして、選択日・今日のハイライトを再現する。
const viewMonth = dayjs("2024-05-01").startOf("month");

function buildCells(month: typeof viewMonth) {
  const startDay = month.startOf("month").day(); // 0=日曜
  const daysInMonth = month.daysInMonth();
  const prevMonth = month.subtract(1, "month");
  const daysInPrevMonth = prevMonth.daysInMonth();
  const nextMonth = month.add(1, "month");

  const cells: { date: string; day: number; currentMonth: boolean }[] = [];
  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      date: prevMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: month.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: true,
    });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      date: nextMonth.date(d).format("YYYY-MM-DD"),
      day: d,
      currentMonth: false,
    });
  }
  return cells;
}

const cells = buildCells(viewMonth);
const noop = () => {};

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 280 }}>{children}</div>;
}

// 「今日(5/15)」と別の「選択日(5/22)」がそれぞれ別ハイライトで出る状態。
export function SelectedAndToday() {
  return (
    <Frame>
      <CalendarGrid
        viewMonth={viewMonth}
        setViewMonth={noop}
        cells={cells}
        selectedDate="2024-05-22"
        today="2024-05-15"
        onDateSelect={noop}
        onClose={noop}
      />
    </Frame>
  );
}

// 選択日 = 今日。「今日へ」ボタンは出ない状態。
export function TodaySelected() {
  return (
    <Frame>
      <CalendarGrid
        viewMonth={viewMonth}
        setViewMonth={noop}
        cells={cells}
        selectedDate="2024-05-15"
        today="2024-05-15"
        onDateSelect={noop}
        onClose={noop}
      />
    </Frame>
  );
}
