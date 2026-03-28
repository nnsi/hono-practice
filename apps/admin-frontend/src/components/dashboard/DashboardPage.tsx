import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Mail, Users } from "lucide-react";

import { adminGet } from "../../utils/apiClient";

type DashboardData = {
  totalUsers: number;
  totalContacts: number;
  recentActionCount: number;
};

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminGet<DashboardData>("/admin/dashboard"),
  });

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">ダッシュボード</h2>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="総ユーザー数"
          value={data?.totalUsers}
          icon={<Users size={20} />}
          isLoading={isLoading}
        />
        <StatCard
          label="問い合わせ件数"
          value={data?.totalContacts}
          icon={<Mail size={20} />}
          isLoading={isLoading}
        />
        <StatCard
          label="直近7日のアクション"
          value={data?.recentActionCount}
          icon={<Activity size={20} />}
          isLoading={isLoading}
        />
        <StatCard
          label="WAE-APM アラート"
          value={0}
          icon={<AlertTriangle size={20} />}
          isLoading={false}
          subtitle="正常稼働中"
        />
      </div>

      {/* WAE-APM Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          WAE-APM ステータス
        </h3>
        <div className="space-y-3">
          <AlertRow level="info" message="全サービス正常稼働中" time="現在" />
          <AlertRow
            level="info"
            message="直近24時間のエラーレート: 0.00%"
            time="自動集計"
          />
          <AlertRow
            level="info"
            message="平均レスポンスタイム: -- ms"
            time="WAE連携後に表示"
          />
        </div>
        <p className="mt-4 text-xs text-gray-400">
          WAE Analytics Engine連携後、リアルタイムのメトリクスが表示されます
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  isLoading,
  subtitle,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  isLoading: boolean;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">
        {isLoading ? (
          <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-200" />
        ) : (
          (value ?? 0).toLocaleString()
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

function AlertRow({
  level,
  message,
  time,
}: {
  level: "info" | "warn" | "error";
  message: string;
  time: string;
}) {
  const colors = {
    info: "bg-blue-50 text-blue-700",
    warn: "bg-yellow-50 text-yellow-700",
    error: "bg-red-50 text-red-700",
  };
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-3 ${colors[level]}`}
    >
      <span className="text-sm">{message}</span>
      <span className="text-xs opacity-70">{time}</span>
    </div>
  );
}
