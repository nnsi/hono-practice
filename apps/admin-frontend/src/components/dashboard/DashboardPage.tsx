import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Mail, Users } from "lucide-react";

import { adminClient } from "../../utils/apiClient";
import { ApmSection } from "./ApmSection";
import { ClientErrorSection } from "./ClientErrorSection";

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await adminClient.admin.dashboard.$get();
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
  });

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
          value={data?.apm?.errorCount}
          icon={<AlertTriangle size={20} />}
          isLoading={isLoading}
          subtitle={
            data?.apm && data.apm.totalRequests > 0
              ? `エラーレート: ${data.apm.errorRate}%`
              : undefined
          }
        />
      </div>

      <ApmSection apm={data?.apm} />

      <ClientErrorSection summary={data?.clientErrors} isLoading={isLoading} />
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
