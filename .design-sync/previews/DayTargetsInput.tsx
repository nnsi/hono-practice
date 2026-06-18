import { useState } from "react";

import { DayTargetsInput } from "actiko-frontend";

// 曜日別の日次目標を設定する入力グループ。チェックで展開し、各曜日に数値を入れる。
// 0 を入れた曜日は「休み」表示になる。controlled なので state で囲んで操作可能にする。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 320 }}
      className="bg-white rounded-xl border border-gray-200 shadow-soft p-4"
    >
      {children}
    </div>
  );
}

export function Collapsed() {
  const [enabled, setEnabled] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <Frame>
      <DayTargetsInput
        enabled={enabled}
        onToggle={setEnabled}
        values={values}
        onChange={setValues}
        defaultTarget="30"
      />
    </Frame>
  );
}

export function ExpandedUniform() {
  const [enabled, setEnabled] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({
    "1": "30",
    "2": "30",
    "3": "30",
    "4": "30",
    "5": "30",
    "6": "30",
    "7": "30",
  });
  return (
    <Frame>
      <DayTargetsInput
        enabled={enabled}
        onToggle={setEnabled}
        values={values}
        onChange={setValues}
        defaultTarget="30"
      />
    </Frame>
  );
}

export function WithRestDays() {
  const [enabled, setEnabled] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({
    "1": "45",
    "2": "30",
    "3": "30",
    "4": "30",
    "5": "45",
    "6": "60",
    "7": "0",
  });
  return (
    <Frame>
      <DayTargetsInput
        enabled={enabled}
        onToggle={setEnabled}
        values={values}
        onChange={setValues}
        defaultTarget="30"
      />
    </Frame>
  );
}
