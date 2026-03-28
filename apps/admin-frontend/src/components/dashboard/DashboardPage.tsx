import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Mail, Users } from "lucide-react";

import { adminGet } from "../../utils/apiClient";

type WaeApmData = {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  avgResponseTimeMs: number;
};

type DashboardData = {
  totalUsers: number;
  totalContacts: number;
  recentActionCount: number;
  apm: WaeApmData;
};

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminGet<DashboardData>("/admin/dashboard"),
  });

  const apm = data?.apm;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">ダッシュボード</h2>

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
          label="24h エラー件数"
          value={apm?.errorCount}
          icon={<AlertTriangle size={20} />}
          isLoading={isLoading}
          subtitle={
            apm && apm.totalRequests > 0
              ? `エラーレート: ${apm.errorRate}%`
              : undefined
          }
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          WAE-APM（直近24時間）
        </h3>
        <div className="space-y-3">
          <ApmRow
            label="総リクエスト数"
            value={
              apm?.totalRequests ? apm.totalRequests.toLocaleString() : "--"
            }
          />
          <ApmRow
            label="エラー件数"
            value={apm?.errorCount?.toString() ?? "--"}
            alert={!!apm && apm.errorCount > 0}
          />
          <ApmRow
            label="エラーレート"
            value={apm?.totalRequests ? `${apm.errorRate}%` : "--"}
            alert={!!apm && apm.errorRate > 1}
          />
          <ApmRow
            label="平均レスポンスタイム"
            value={
              apm?.avgResponseTimeMs ? `${apm.avgResponseTimeMs} ms` : "--"
            }
            alert={!!apm && apm.avgResponseTimeMs > 500}
          />
        </div>
        {!apm?.totalRequests && (
          <p className="mt-4 text-xs text-gray-400">
            CF_API_TOKEN未設定、またはデータなし
          </p>
        )}
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

function ApmRow({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  const bg = alert ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700";
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-3 ${bg}`}
    >
      <span className="text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
