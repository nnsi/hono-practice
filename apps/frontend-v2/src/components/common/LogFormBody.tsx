import { useState } from "react";
import { Play, Square, RotateCcw } from "lucide-react";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { useTimer } from "../../hooks/useTimer";
import { activityLogRepository } from "../../db/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { DexieActivity } from "../../db/schema";
import {
  isTimeUnit,
  getTimeUnitType,
  convertSecondsToUnit,
  formatElapsedTime,
  generateTimeMemo,
  type TimeUnitType,
} from "../../utils/timeUtils";

/**
 * Activity記録のフォーム本体（タブ切り替え + 手動入力 + タイマー）
 * DB保存は常に内部で完結する（オフラインファースト）
 */
export function LogFormBody({
  activity,
  date,
  onDone,
}: {
  activity: DexieActivity;
  date: string;
  onDone: () => void;
}) {
  const timerEnabled = isTimeUnit(activity.quantityUnit);
  const timeUnitType = getTimeUnitType(activity.quantityUnit);
  const [activeTab, setActiveTab] = useState<"manual" | "timer">(
    timerEnabled ? "timer" : "manual",
  );
  const [quantity, setQuantity] = useState("1");
  const [memo, setMemo] = useState("");
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { kinds } = useActivityKinds(activity.id);
  const timer = useTimer(activity.id);

  const effectiveTab =
    timerEnabled && timer.isRunning ? "timer" : activeTab;

  const saveLog = async (params: {
    quantity: number | null;
    memo: string;
    selectedKindId: string | null;
  }) => {
    await activityLogRepository.createActivityLog({
      activityId: activity.id,
      activityKindId: params.selectedKindId,
      quantity: params.quantity,
      memo: params.memo,
      date,
      time: null,
    });
    syncEngine.syncActivityLogs();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await saveLog({
      quantity: quantity !== "" ? Number(quantity) : null,
      memo,
      selectedKindId,
    });
    setIsSubmitting(false);
    onDone();
  };

  const handleTimerSave = async () => {
    setIsSubmitting(true);
    const seconds = timer.getElapsedSeconds();
    const convertedQuantity = convertSecondsToUnit(seconds, timeUnitType);
    const startDate = timer.getStartDate();
    const endDate = new Date();
    const timerMemo = startDate ? generateTimeMemo(startDate, endDate) : "";

    await saveLog({
      quantity: convertedQuantity,
      memo: timerMemo,
      selectedKindId,
    });
    timer.reset();
    setIsSubmitting(false);
    onDone();
  };

  return (
    <>
      {/* タブ切り替え */}
      {timerEnabled && (
        <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              effectiveTab === "manual"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500"
            }`}
          >
            手動入力
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("timer")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              effectiveTab === "timer"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500"
            }`}
          >
            タイマー
          </button>
        </div>
      )}

      {effectiveTab === "timer" ? (
        <TimerPanel
          timer={timer}
          activity={activity}
          kinds={kinds}
          selectedKindId={selectedKindId}
          onSelectKind={setSelectedKindId}
          timeUnitType={timeUnitType}
          isSubmitting={isSubmitting}
          onSave={handleTimerSave}
        />
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          {kinds.length > 0 && (
            <KindSelector
              kinds={kinds}
              selectedKindId={selectedKindId}
              onSelect={setSelectedKindId}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              数量 {activity.quantityUnit && `(${activity.quantityUnit})`}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              min="0"
              step="any"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="メモを入力..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            記録する
          </button>
        </form>
      )}
    </>
  );
}

// --- タイマーパネル ---

function TimerPanel({
  timer,
  activity,
  kinds,
  selectedKindId,
  onSelectKind,
  timeUnitType,
  isSubmitting,
  onSave,
}: {
  timer: ReturnType<typeof useTimer>;
  activity: DexieActivity;
  kinds: { id: string; name: string; color: string | null }[];
  selectedKindId: string | null;
  onSelectKind: (id: string | null) => void;
  timeUnitType: TimeUnitType;
  isSubmitting: boolean;
  onSave: () => void;
}) {
  const { isRunning, elapsedTime, start, stop, reset, getElapsedSeconds } =
    timer;
  const stopped = !isRunning && elapsedTime > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center py-4">
        <div className="text-5xl font-mono font-bold tabular-nums tracking-tight">
          {formatElapsedTime(elapsedTime)}
        </div>
        {isRunning && (
          <div className="text-sm text-gray-400 mt-2">計測中...</div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        {isRunning ? (
          <button
            type="button"
            onClick={stop}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
          >
            <Square size={18} />
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={() => start()}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            <Play size={18} />
            {elapsedTime > 0 ? "再開" : "開始"}
          </button>
        )}
        {stopped && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      {stopped && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <div className="text-center text-sm text-gray-500">
            記録時間:{" "}
            <span className="font-semibold text-black">
              {convertSecondsToUnit(getElapsedSeconds(), timeUnitType)}{" "}
              {activity.quantityUnit}
            </span>
          </div>

          {kinds.length > 0 && (
            <KindSelector
              kinds={kinds}
              selectedKindId={selectedKindId}
              onSelect={onSelectKind}
            />
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={isSubmitting}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "記録中..." : "記録する"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- 種類セレクタ ---

export function KindSelector({
  kinds,
  selectedKindId,
  onSelect,
}: {
  kinds: { id: string; name: string; color: string | null }[];
  selectedKindId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-600">種類</label>
      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => (
          <button
            key={kind.id}
            type="button"
            onClick={() => onSelect(selectedKindId === kind.id ? null : kind.id)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selectedKindId === kind.id
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {kind.color && (
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                style={{ backgroundColor: kind.color }}
              />
            )}
            {kind.name}
          </button>
        ))}
      </div>
    </div>
  );
}
