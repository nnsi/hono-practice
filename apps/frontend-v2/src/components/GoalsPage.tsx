import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Target,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  Calendar,
  TrendingUp,
  Flame,
  Trophy,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useActivities } from "../hooks/useActivities";
import { apiFetch } from "../utils/apiClient";
import type { DexieActivity } from "../db/schema";

// --- Types ---

type Goal = {
  id: string;
  userId: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  description?: string;
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  inactiveDates: string[];
  createdAt: string;
  updatedAt: string;
};

type GoalStats = {
  goalId: string;
  startDate: string;
  endDate: string;
  dailyRecords: { date: string; quantity: number; achieved: boolean }[];
  stats: {
    average: number;
    max: number;
    maxConsecutiveDays: number;
    achievedDays: number;
  };
};

type CreateGoalPayload = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
};

type UpdateGoalPayload = {
  dailyTargetQuantity?: number;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
};

// --- Normalizer ---

function normalizeGoal(g: Record<string, unknown>): Goal {
  return {
    id: g.id as string,
    userId: (g.userId ?? g.user_id) as string,
    activityId: (g.activityId ?? g.activity_id) as string,
    dailyTargetQuantity: Number(g.dailyTargetQuantity ?? g.daily_target_quantity),
    startDate: (g.startDate ?? g.start_date) as string,
    endDate: (g.endDate ?? g.end_date) as string | undefined,
    isActive: (g.isActive ?? g.is_active) as boolean,
    description: (g.description ?? "") as string,
    currentBalance: Number(g.currentBalance ?? g.current_balance ?? 0),
    totalTarget: Number(g.totalTarget ?? g.total_target ?? 0),
    totalActual: Number(g.totalActual ?? g.total_actual ?? 0),
    inactiveDates: (g.inactiveDates ?? g.inactive_dates ?? []) as string[],
    createdAt: (g.createdAt ?? g.created_at) as string,
    updatedAt: (g.updatedAt ?? g.updated_at) as string,
  };
}

// --- API helpers ---

async function fetchGoals(): Promise<Goal[]> {
  const res = await apiFetch("/users/goals");
  if (!res.ok) throw new Error("Failed to fetch goals");
  const data = await res.json();
  const goals = data.goals ?? data;
  return (goals as Record<string, unknown>[]).map(normalizeGoal);
}

async function fetchGoalStats(goalId: string): Promise<GoalStats> {
  const res = await apiFetch(`/users/goals/${goalId}/stats`);
  if (!res.ok) throw new Error("Failed to fetch goal stats");
  return await res.json();
}

async function createGoalApi(payload: CreateGoalPayload): Promise<Goal> {
  const res = await apiFetch("/users/goals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create goal");
  const data = await res.json();
  return normalizeGoal(data);
}

async function updateGoalApi(goalId: string, payload: UpdateGoalPayload): Promise<Goal> {
  const res = await apiFetch(`/users/goals/${goalId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update goal");
  const data = await res.json();
  return normalizeGoal(data);
}

async function deleteGoalApi(goalId: string): Promise<void> {
  const res = await apiFetch(`/users/goals/${goalId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete goal");
}

// --- Activity helpers ---

function getActivityEmoji(activity: DexieActivity | undefined): string {
  if (!activity) return "📝";
  if (activity.iconType === "emoji" && activity.emoji) return activity.emoji;
  return "📝";
}

function getActivityIcon(activity: DexieActivity | undefined): React.ReactNode {
  if (!activity) return <span className="text-2xl">📝</span>;
  if (activity.iconType === "emoji" && activity.emoji) {
    return <span className="text-2xl">{activity.emoji}</span>;
  }
  if (activity.iconThumbnailUrl || activity.iconUrl) {
    return (
      <img
        src={activity.iconThumbnailUrl || activity.iconUrl || ""}
        alt=""
        className="w-8 h-8 rounded"
      />
    );
  }
  return <span className="text-2xl">📝</span>;
}

// --- Main component ---

export function GoalsPage() {
  const { activities } = useActivities();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGoals();
      setGoals(data);
    } catch {
      setError("目標の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const activityMap = useMemo(() => {
    const map = new Map<string, DexieActivity>();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  const currentGoals = useMemo(
    () => goals.filter((g) => g.isActive),
    [goals],
  );
  const pastGoals = useMemo(
    () => goals.filter((g) => !g.isActive),
    [goals],
  );

  const handleGoalCreated = async (payload: CreateGoalPayload) => {
    const newGoal = await createGoalApi(payload);
    setGoals((prev) => [...prev, newGoal]);
    setCreateDialogOpen(false);
  };

  const handleGoalUpdated = async (goalId: string, payload: UpdateGoalPayload) => {
    const updated = await updateGoalApi(goalId, payload);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
    setEditingGoalId(null);
  };

  const handleGoalDeleted = async (goalId: string) => {
    await deleteGoalApi(goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          type="button"
          onClick={loadGoals}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Target size={20} />
            目標
          </h1>
          <span className="text-sm text-gray-500">
            {currentGoals.length}件の目標
          </span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* 現在の目標 */}
        {currentGoals.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Target size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">まだ目標がありません</p>
          </div>
        )}

        {currentGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            activity={activityMap.get(goal.activityId)}
            isExpanded={expandedGoalId === goal.id}
            isEditing={editingGoalId === goal.id}
            onToggleExpand={() => handleToggleExpand(goal.id)}
            onEditStart={() => setEditingGoalId(goal.id)}
            onEditEnd={() => setEditingGoalId(null)}
            onUpdate={(payload) => handleGoalUpdated(goal.id, payload)}
            onDelete={() => handleGoalDeleted(goal.id)}
          />
        ))}

        {/* 新規目標を追加 */}
        <button
          type="button"
          onClick={() => setCreateDialogOpen(true)}
          className="w-full h-20 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <Plus size={20} className="text-gray-400 group-hover:text-gray-600" />
          <span className="text-sm text-gray-500 group-hover:text-gray-700">
            新規目標を追加
          </span>
        </button>

        {/* 過去の目標 */}
        {pastGoals.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-gray-500 mb-3">
              過去の目標
            </h2>
            <div className="space-y-3">
              {pastGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  activity={activityMap.get(goal.activityId)}
                  isExpanded={expandedGoalId === goal.id}
                  isEditing={false}
                  isPast
                  onToggleExpand={() => handleToggleExpand(goal.id)}
                  onEditStart={() => {}}
                  onEditEnd={() => {}}
                  onUpdate={() => Promise.resolve()}
                  onDelete={() => handleGoalDeleted(goal.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 作成ダイアログ */}
      {createDialogOpen && (
        <CreateGoalDialog
          activities={activities}
          onClose={() => setCreateDialogOpen(false)}
          onCreate={handleGoalCreated}
        />
      )}
    </div>
  );
}

// --- GoalCard ---

function GoalCard({
  goal,
  activity,
  isExpanded,
  isEditing,
  isPast = false,
  onToggleExpand,
  onEditStart,
  onEditEnd,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  activity: DexieActivity | undefined;
  isExpanded: boolean;
  isEditing: boolean;
  isPast?: boolean;
  onToggleExpand: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onUpdate: (payload: UpdateGoalPayload) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const totalDays = useMemo(() => {
    const start = dayjs(goal.startDate);
    const end = goal.endDate ? dayjs(goal.endDate) : dayjs();
    return Math.max(end.diff(start, "day") + 1, 1);
  }, [goal.startDate, goal.endDate]);

  const elapsedDays = useMemo(() => {
    const start = dayjs(goal.startDate);
    const today = dayjs();
    const end = goal.endDate ? dayjs(goal.endDate) : today;
    const effectiveEnd = today.isBefore(end) ? today : end;
    return Math.max(effectiveEnd.diff(start, "day") + 1, 0);
  }, [goal.startDate, goal.endDate]);

  const progressPercent = useMemo(() => {
    if (totalDays === 0) return 0;
    const pct = (elapsedDays / totalDays) * 100;
    return Math.min(pct, 100);
  }, [elapsedDays, totalDays]);

  const balanceColor = goal.currentBalance < 0 ? "text-red-600" : "text-blue-600";
  const balanceLabel = goal.currentBalance < 0 ? "負債" : "貯金";

  const handleDelete = async () => {
    if (!confirm("この目標を削除しますか？")) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <EditGoalForm
        goal={goal}
        activity={activity}
        onCancel={onEditEnd}
        onSave={onUpdate}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div
      className={`rounded-xl border ${isPast ? "border-gray-200 bg-gray-50 opacity-75" : "border-gray-200 bg-white"} shadow-sm overflow-hidden transition-all duration-200`}
    >
      {/* カードヘッダー */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        {/* アクティビティアイコン */}
        <div className="flex-shrink-0">{getActivityIcon(activity)}</div>

        {/* メイン情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {activity?.name ?? "不明なアクティビティ"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span>
              {goal.dailyTargetQuantity}
              {activity?.quantityUnit ?? ""}/日
            </span>
            <span className="text-gray-300">|</span>
            <span>
              {dayjs(goal.startDate).format("M/D")}〜
              {goal.endDate ? dayjs(goal.endDate).format("M/D") : ""}
            </span>
          </div>
        </div>

        {/* 右側 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <span className={`text-xs font-medium ${balanceColor}`}>
              {balanceLabel}: {Math.abs(goal.currentBalance).toLocaleString()}
              {activity?.quantityUnit ?? ""}
            </span>
          </div>
          {!isPast && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStart();
              }}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Pencil size={14} className="text-gray-400" />
            </button>
          )}
          {isPast && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={deleting}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Trash2 size={14} className="text-gray-400" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* プログレスバー */}
      <div className="px-4 pb-2">
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-blue-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>{elapsedDays}日経過</span>
          <span>全{totalDays}日</span>
        </div>
      </div>

      {/* 展開時: 統計詳細 */}
      {isExpanded && (
        <GoalStatsDetail goalId={goal.id} activity={activity} />
      )}
    </div>
  );
}

// --- GoalStatsDetail ---

function GoalStatsDetail({
  goalId,
  activity,
}: {
  goalId: string;
  activity: DexieActivity | undefined;
}) {
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGoalStats(goalId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  if (loading) {
    return (
      <div className="px-4 pb-4 flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-gray-400" />
        <span className="ml-2 text-xs text-gray-400">統計を読み込み中...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="px-4 pb-4 text-xs text-gray-400 text-center py-4">
        統計の取得に失敗しました
      </div>
    );
  }

  const unit = activity?.quantityUnit ?? "";
  const totalDays = stats.dailyRecords.length;
  const activeDays = stats.dailyRecords.filter((r) => r.quantity > 0).length;
  const achieveRate = totalDays > 0 ? (stats.stats.achievedDays / totalDays) * 100 : 0;

  return (
    <div className="px-4 pb-4 border-t border-gray-100">
      {/* 統計グリッド */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <StatCard
          icon={<Calendar size={14} />}
          label="活動日数"
          value={`${activeDays}日`}
          sub={`/ ${totalDays}日`}
        />
        <StatCard
          icon={<Trophy size={14} />}
          label="達成日数"
          value={`${stats.stats.achievedDays}日`}
          sub={`${achieveRate.toFixed(0)}%`}
        />
        <StatCard
          icon={<Flame size={14} />}
          label="最大連続日数"
          value={`${stats.stats.maxConsecutiveDays}日`}
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="平均活動量"
          value={`${stats.stats.average}${unit}`}
        />
        <StatCard
          icon={<BarChart3 size={14} />}
          label="最大活動量"
          value={`${stats.stats.max}${unit}`}
        />
      </div>

      {/* 直近の日次記録(最新7日分) */}
      {stats.dailyRecords.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1.5">直近の記録</p>
          <div className="flex gap-1">
            {stats.dailyRecords
              .slice(-14)
              .map((record) => (
                <div
                  key={record.date}
                  className={`flex-1 h-6 rounded-sm ${
                    record.achieved
                      ? "bg-green-400"
                      : record.quantity > 0
                        ? "bg-yellow-300"
                        : "bg-gray-200"
                  }`}
                  title={`${record.date}: ${record.quantity}${unit}`}
                />
              ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{dayjs(stats.dailyRecords.slice(-14)[0]?.date).format("M/D")}</span>
            <span>{dayjs(stats.dailyRecords[stats.dailyRecords.length - 1]?.date).format("M/D")}</span>
          </div>
          <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-green-400" />
              達成
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-yellow-300" />
              活動あり
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-gray-200" />
              未活動
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- StatCard ---

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold">{value}</span>
        {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

// --- EditGoalForm ---

function EditGoalForm({
  goal,
  activity,
  onCancel,
  onSave,
  onDelete,
}: {
  goal: Goal;
  activity: DexieActivity | undefined;
  onCancel: () => void;
  onSave: (payload: UpdateGoalPayload) => Promise<void>;
  onDelete: () => void;
}) {
  const [target, setTarget] = useState(String(goal.dailyTargetQuantity));
  const [startDate, setStartDate] = useState(goal.startDate);
  const [endDate, setEndDate] = useState(goal.endDate ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        dailyTargetQuantity: Number(target),
        startDate,
        endDate: endDate || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("この目標を終了しますか？")) return;
    setSaving(true);
    try {
      await onSave({ isActive: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-blue-300 bg-blue-50/30 shadow-sm overflow-hidden">
      <form onSubmit={handleSave} className="p-4 space-y-3">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            {getActivityIcon(activity)}
            <span className="font-semibold text-sm">
              {activity?.name ?? "不明なアクティビティ"}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-gray-200 rounded-md"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* 日次目標 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            日次目標 {activity?.quantityUnit && `(${activity.quantityUnit})`}
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="any"
          />
        </div>

        {/* 日付 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            保存
          </button>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            終了
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}

// --- CreateGoalDialog ---

function CreateGoalDialog({
  activities,
  onClose,
  onCreate,
}: {
  activities: DexieActivity[];
  onClose: () => void;
  onCreate: (payload: CreateGoalPayload) => Promise<void>;
}) {
  const [activityId, setActivityId] = useState("");
  const [target, setTarget] = useState("1");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === activityId),
    [activities, activityId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!activityId) {
      setErrorMsg("アクティビティを選択してください");
      return;
    }
    if (Number(target) <= 0) {
      setErrorMsg("日次目標は0より大きい数値を入力してください");
      return;
    }
    if (!startDate) {
      setErrorMsg("開始日を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        activityId,
        dailyTargetQuantity: Number(target),
        startDate,
        ...(endDate ? { endDate } : {}),
      });
    } catch {
      setErrorMsg("作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">新しい目標を作成</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* アクティビティ選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              アクティビティ
            </label>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400">
                アクティビティがありません
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActivityId(a.id)}
                    className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
                      activityId === a.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xl">{getActivityEmoji(a)}</span>
                    <span className="text-[10px] mt-1 truncate w-full text-center">
                      {a.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 日次目標 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              日次目標
              {selectedActivity?.quantityUnit && (
                <span className="ml-1 text-xs text-gray-400">
                  ({selectedActivity.quantityUnit})
                </span>
              )}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="any"
            />
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                終了日（任意）
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
