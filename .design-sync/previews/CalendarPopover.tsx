import { CalendarPopover } from "actiko-frontend";

// 日付選択ポップオーバー。triggerRef を渡さない場合は popoverClassName で
// 位置決めできるので、ここでは絶対配置を外して静的なカードとして描画する。
// セル組み立て・today(getToday) はコンポーネント内部で処理される
// （キャプチャ時刻は 2024-05-15 固定なので、その月の選択日を渡す）。
const noop = () => {};

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 280 }}>{children}</div>;
}

export function Open() {
  return (
    <Frame>
      <CalendarPopover
        selectedDate="2024-05-22"
        onDateSelect={noop}
        isOpen={true}
        onClose={noop}
        popoverClassName="w-[280px]"
      />
    </Frame>
  );
}
