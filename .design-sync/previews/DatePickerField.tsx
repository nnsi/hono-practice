import { DatePickerField } from "actiko-frontend";

// 日付入力フィールド（閉じた状態のトリガーボタンを描画）。
// クリックでカレンダーポップオーバーが開くが、ここでは閉じた状態の
// 各バリアント（未設定／設定済み／クリア可／無効）を見せる。
const noop = () => {};

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 260 }}>{children}</div>;
}

export function Empty() {
  return (
    <Frame>
      <DatePickerField value="" onChange={noop} placeholder="開始日を選択" />
    </Frame>
  );
}

export function WithValue() {
  return (
    <Frame>
      <DatePickerField value="2024-05-22" onChange={noop} />
    </Frame>
  );
}

export function Clearable() {
  return (
    <Frame>
      <DatePickerField value="2024-05-22" onChange={noop} allowClear />
    </Frame>
  );
}

export function Disabled() {
  return (
    <Frame>
      <DatePickerField value="2024-05-01" onChange={noop} disabled />
    </Frame>
  );
}
