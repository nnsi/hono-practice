import { useState } from "react";

import { CreateGoalFields } from "actiko-frontend";

// ゴール新規作成フォームの本体フィールド群（アクティビティ選択・日次目標・期間・
// 曜日別目標・負債上限）。全て controlled なので state コンテナで囲んで操作可能に。
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

const baseActivity = {
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

const activities = [
  baseActivity,
  {
    ...baseActivity,
    id: "act-read",
    name: "読書",
    emoji: "📚",
    quantityUnit: "ページ",
    orderIndex: "a1",
  },
  {
    ...baseActivity,
    id: "act-study",
    name: "勉強",
    emoji: "📖",
    quantityUnit: "分",
    orderIndex: "a2",
  },
];

export function Default() {
  const [activityId, setActivityId] = useState("act-run");
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
      <CreateGoalFields
        activities={activities}
        activityId={activityId}
        setActivityId={setActivityId}
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
        selectedActivity={activities[0]}
        errorMsg=""
      />
    </Frame>
  );
}

export function WithDayTargetsAndDebtCap() {
  const [activityId, setActivityId] = useState("act-read");
  const [target, setTarget] = useState("20");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("");
  const [dayTargetsEnabled, setDayTargetsEnabled] = useState(true);
  const [dayTargetValues, setDayTargetValues] = useState<
    Record<string, string>
  >({
    "1": "20",
    "2": "20",
    "3": "20",
    "4": "20",
    "5": "20",
    "6": "40",
    "7": "0",
  });
  const [debtCapEnabled, setDebtCapEnabled] = useState(true);
  const [debtCapValue, setDebtCapValue] = useState("140");
  return (
    <Frame>
      <CreateGoalFields
        activities={activities}
        activityId={activityId}
        setActivityId={setActivityId}
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
        selectedActivity={activities[1]}
        errorMsg=""
      />
    </Frame>
  );
}

export function WithError() {
  const [activityId, setActivityId] = useState("act-run");
  const [target, setTarget] = useState("0");
  const [startDate, setStartDate] = useState("2026-06-30");
  const [endDate, setEndDate] = useState("2026-06-01");
  const [dayTargetsEnabled, setDayTargetsEnabled] = useState(false);
  const [dayTargetValues, setDayTargetValues] = useState<
    Record<string, string>
  >({});
  const [debtCapEnabled, setDebtCapEnabled] = useState(false);
  const [debtCapValue, setDebtCapValue] = useState("");
  return (
    <Frame>
      <CreateGoalFields
        activities={activities}
        activityId={activityId}
        setActivityId={setActivityId}
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
        selectedActivity={activities[0]}
        errorMsg="終了日は開始日より後にしてください"
      />
    </Frame>
  );
}
