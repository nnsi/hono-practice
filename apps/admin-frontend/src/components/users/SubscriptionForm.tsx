import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { adminClient } from "../../utils/apiClient";

type SubscriptionFormProps = {
  userId: string;
  existing: {
    plan: "free" | "premium";
    status: "trial" | "active" | "paused" | "cancelled" | "expired";
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
};

type Plan = "free" | "premium";
type Status = "active" | "paused" | "cancelled" | "expired";

type FormBody = {
  plan: Plan;
  status: Status;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
};

const VALID_PLANS: Plan[] = ["free", "premium"];
const VALID_STATUSES: Status[] = ["active", "paused", "cancelled", "expired"];

function isPlan(value: string): value is Plan {
  return (VALID_PLANS as string[]).includes(value);
}

function isStatus(value: string): value is Status {
  return (VALID_STATUSES as string[]).includes(value);
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function SubscriptionForm({
  userId,
  existing,
  onSuccess,
  onCancel,
}: SubscriptionFormProps) {
  const queryClient = useQueryClient();

  const [plan, setPlan] = useState(existing?.plan ?? "free");
  const [status, setStatus] = useState<Status>(
    existing?.status === "trial" ? "active" : (existing?.status ?? "active"),
  );
  const [periodStart, setPeriodStart] = useState(
    toDateInputValue(existing?.currentPeriodStart),
  );
  const [periodEnd, setPeriodEnd] = useState(
    toDateInputValue(existing?.currentPeriodEnd),
  );

  const mutation = useMutation({
    mutationFn: async (body: FormBody) => {
      const res = await adminClient.admin.users[":id"].subscription.$put({
        param: { id: userId },
        json: body,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", userId] });
      onSuccess();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: FormBody = { plan, status };
    if (periodStart) {
      body.currentPeriodStart = periodStart;
    } else if (existing?.currentPeriodStart) {
      body.currentPeriodStart = null;
    }
    if (periodEnd) {
      body.currentPeriodEnd = periodEnd;
    } else if (existing?.currentPeriodEnd) {
      body.currentPeriodEnd = null;
    }
    mutation.mutate(body);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">
        {existing ? "サブスクリプション編集" : "サブスクリプション作成"}
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          プラン
        </label>
        <select
          value={plan}
          onChange={(e) => {
            if (isPlan(e.target.value)) setPlan(e.target.value);
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="free">free</option>
          <option value="premium">premium</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ステータス
        </label>
        <select
          value={status}
          onChange={(e) => {
            if (isStatus(e.target.value)) setStatus(e.target.value);
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="cancelled">cancelled</option>
          <option value="expired">expired</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          期間開始（任意）
        </label>
        <input
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          期間終了（任意）
        </label>
        <input
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          エラーが発生しました。再試行してください。
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {mutation.isPending ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
