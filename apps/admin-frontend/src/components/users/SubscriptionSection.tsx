import { useState } from "react";

import dayjs from "dayjs";

import { SubscriptionForm } from "./SubscriptionForm";

type Subscription = {
  id: string;
  userId: string;
  plan: "free" | "premium";
  status: "trial" | "active" | "paused" | "cancelled" | "expired";
  paymentProvider: string | null;
  paymentProviderId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

function PlanBadge({ plan }: { plan: "free" | "premium" }) {
  if (plan === "premium") {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
        premium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      free
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: "trial" | "active" | "paused" | "cancelled" | "expired";
}) {
  const styles: Record<typeof status, string> = {
    active: "bg-green-100 text-green-800",
    trial: "bg-blue-100 text-blue-800",
    paused: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
    expired: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

type SubscriptionSectionProps = {
  subscription: Subscription | null;
  userId: string;
};

export function SubscriptionSection({
  subscription,
  userId,
}: SubscriptionSectionProps) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <SubscriptionForm
          userId={userId}
          existing={
            subscription
              ? {
                  plan: subscription.plan,
                  status: subscription.status,
                  currentPeriodStart: subscription.currentPeriodStart,
                  currentPeriodEnd: subscription.currentPeriodEnd,
                }
              : null
          }
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          サブスクリプション
        </h2>
        <p className="mb-4 text-sm text-gray-500">サブスクリプションなし</p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white"
        >
          作成
        </button>
      </div>
    );
  }

  const providerLabel =
    subscription.paymentProvider === "admin_manual"
      ? "手動付与"
      : (subscription.paymentProvider ?? "-");

  const start = subscription.currentPeriodStart
    ? dayjs(subscription.currentPeriodStart).format("YYYY/MM/DD")
    : null;
  const end = subscription.currentPeriodEnd
    ? dayjs(subscription.currentPeriodEnd).format("YYYY/MM/DD")
    : null;
  const periodLabel =
    start && end
      ? `${start} 〜 ${end}`
      : start
        ? `${start} 〜`
        : end
          ? `〜 ${end}`
          : "-";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">サブスクリプション</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
        >
          編集
        </button>
      </div>
      <dl className="space-y-4">
        <div>
          <dt className="mb-1 text-sm font-medium text-gray-500">プラン</dt>
          <dd>
            <PlanBadge plan={subscription.plan} />
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-sm font-medium text-gray-500">ステータス</dt>
          <dd>
            <StatusBadge status={subscription.status} />
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-sm font-medium text-gray-500">
            支払いプロバイダ
          </dt>
          <dd className="text-sm text-gray-900">{providerLabel}</dd>
        </div>
        <div>
          <dt className="mb-1 text-sm font-medium text-gray-500">期間</dt>
          <dd className="text-sm text-gray-900">{periodLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
