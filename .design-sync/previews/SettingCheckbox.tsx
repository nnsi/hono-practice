import { SettingCheckbox } from "actiko-frontend";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 360 }}
      className="bg-white rounded-xl border border-gray-200 shadow-soft overflow-hidden"
    >
      {children}
    </div>
  );
}

export function Checked() {
  return (
    <Frame>
      <SettingCheckbox
        id="praise"
        label="褒めモード"
        description="記録時のフィードバックに褒めメッセージと演出を追加します"
        checked={true}
        onChange={() => {}}
      />
    </Frame>
  );
}

export function Unchecked() {
  return (
    <Frame>
      <SettingCheckbox
        id="launch"
        label="起動時に目標画面を表示"
        description="アプリ起動時の初期画面を目標画面にします"
        checked={false}
        onChange={() => {}}
      />
    </Frame>
  );
}
