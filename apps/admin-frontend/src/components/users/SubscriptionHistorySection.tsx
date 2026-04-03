import dayjs from "dayjs";

type SubscriptionHistoryItem = {
  id: string;
  eventType: string;
  plan: "free" | "premium";
  status: "trial" | "active" | "paused" | "cancelled" | "expired";
  source: string;
  createdAt: string;
};

type SubscriptionHistorySectionProps = {
  history: SubscriptionHistoryItem[];
};

const planStyles: Record<SubscriptionHistoryItem["plan"], string> = {
  premium: "bg-purple-100 text-purple-800",
  free: "bg-gray-100 text-gray-700",
};

const statusStyles: Record<SubscriptionHistoryItem["status"], string> = {
  active: "bg-green-100 text-green-800",
  trial: "bg-blue-100 text-blue-800",
  paused: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-red-100 text-red-800",
};

export function SubscriptionHistorySection({
  history,
}: SubscriptionHistorySectionProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-gray-900">変更履歴</h2>
        <p className="text-sm text-gray-500">履歴なし</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-xl font-bold text-gray-900">変更履歴</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
              <th className="pb-2 pr-4">日時</th>
              <th className="pb-2 pr-4">イベント</th>
              <th className="pb-2 pr-4">プラン</th>
              <th className="pb-2 pr-4">ステータス</th>
              <th className="pb-2">ソース</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-900">
                  {dayjs(item.createdAt).format("YYYY/MM/DD HH:mm")}
                </td>
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                    {item.eventType}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${planStyles[item.plan]}`}
                  >
                    {item.plan}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="py-2 text-gray-600">
                  {item.source === "admin_manual" ? "手動" : item.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
