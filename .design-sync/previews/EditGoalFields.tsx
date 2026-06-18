import { useState } from "react";

import { EditGoalFields } from "actiko-frontend";

// ゴール編集フォームの本体フィールド群（日次目標・期間・曜日別目標・負債上限）。
// CreateGoalFields からアクティビティ選択を除いた版。全て controlled。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 340 }}
      className="bg-white rounded-xl border border-gray-200 shadow-soft p-4 space-y-4"
    >
      {children}
    </div>
  );
}

const runningActivity = {
  id: "act-run",
  userId: "user-1",
  name: "ランニング",
  label: "ランニング",
  emoji: "🏃",
  iconType: "emoji" as const,
  iconUrl: null,
  iconThumbnailUrl: null,
  description: "",
  quantityUnit: "分",
  orderIndex: "a0",
  showCombinedStats: true,
  recordingMode: "manual" as const,
  recordingModeConfig: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "synced" as const,
};

export function Default() {
  const [target, setTarget] = useState("30");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");
  const [dayTargetsEnabled, setDayTargetsEnabled] = useState(false);
  const [dayTargetValues, setDayTargetValues] = useState<
    Record<string, string>
  >({});
  const [debtCapEnabled, setDebtCapEnabled] = useState(false);
  const [debtCapValue, setDebtCapValue] = useState("");
  return (
    <Frame>
      <EditGoalFields
        activity={runningActivity}
        target={target}
        setTarget={setTarget}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        dayTargetsEnabled={dayTargetsEnabled}
        setDayTargetsEnabled={setDayTargetsEnabled}
        dayTargetValues={dayTargetValues}
        setDayTargetValues={setDayTargetValues}
        debtCapEnabled={debtCapEnabled}
        setDebtCapEnabled={setDebtCapEnabled}
        debtCapValue={debtCapValue}
        setDebtCapValue={setDebtCapValue}
        errorMsg=""
      />
    </Frame>
  );
}

export function WithDayTargetsAndDebtCap() {
  const [target, setTarget] = useState("45");
  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("");
  const [dayTargetsEnabled, setDayTargetsEnabled] = useState(true);
  const [dayTargetValues, setDayTargetValues] = useState<
    Record<string, string>
  >({
    "1": "45",
    "2": "30",
    "3": "45",
    "4": "30",
    "5": "45",
    "6": "60",
    "7": "0",
  });
  const [debtCapEnabled, setDebtCapEnabled] = useState(true);
  const [debtCapValue, setDebtCapValue] = useState("315");
  return (
    <Frame>
      <EditGoalFields
        activity={runningActivity}
        target={target}
        setTarget={setTarget}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        dayTargetsEnabled={dayTargetsEnabled}
        setDayTargetsEnabled={setDayTargetsEnabled}
        dayTargetValues={dayTargetValues}
        setDayTargetValues={setDayTargetValues}
        debtCapEnabled={debtCapEnabled}
        setDebtCapEnabled={setDebtCapEnabled}
        debtCapValue={debtCapValue}
        setDebtCapValue={setDebtCapValue}
        errorMsg=""
      />
    </Frame>
  );
}

export function WithError() {
  const [target, setTarget] = useState("30");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-05-01");
  const [dayTargetsEnabled, setDayTargetsEnabled] = useState(false);
  const [dayTargetValues, setDayTargetValues] = useState<
    Record<string, string>
  >({});
  const [debtCapEnabled, setDebtCapEnabled] = useState(false);
  const [debtCapValue, setDebtCapValue] = useState("");
  return (
    <Frame>
      <EditGoalFields
        activity={runningActivity}
        target={target}
        setTarget={setTarget}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        dayTargetsEnabled={dayTargetsEnabled}
        setDayTargetsEnabled={setDayTargetsEnabled}
        dayTargetValues={dayTargetValues}
        setDayTargetValues={setDayTargetValues}
        debtCapEnabled={debtCapEnabled}
        setDebtCapEnabled={setDebtCapEnabled}
        debtCapValue={debtCapValue}
        setDebtCapValue={setDebtCapValue}
        errorMsg="終了日は開始日より後にしてください"
      />
    </Frame>
  );
}
