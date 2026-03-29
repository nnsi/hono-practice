import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Monitor, Smartphone } from "lucide-react";

import { adminClient } from "../../utils/apiClient";
import { ClientErrorDetailList } from "./ClientErrorDetailList";

type ClientErrorSummary = {
  web: number;
  ios: number;
  android: number;
};

type Props = {
  summary: ClientErrorSummary | undefined;
  isLoading: boolean;
};

export function ClientErrorSection({ summary, isLoading }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin", "client-errors", selectedPlatform],
    queryFn: async () => {
      const res = await adminClient.admin["client-errors"][":platform"].$get({
        param: { platform: selectedPlatform! },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    enabled: !!selectedPlatform,
  });

  const mobileCount = (summary?.ios ?? 0) + (summary?.android ?? 0);

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        クライアントエラー（直近24時間）
      </h3>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlatformCard
          label="Web"
          count={summary?.web ?? 0}
          icon={<Monitor size={18} />}
          isLoading={isLoading}
          isSelected={selectedPlatform === "web"}
          onClick={() =>
            setSelectedPlatform((p) => (p === "web" ? null : "web"))
          }
        />
        <PlatformCard
          label="Mobile"
          count={mobileCount}
          subtitle={
            summary
              ? `iOS: ${summary.ios} / Android: ${summary.android}`
              : undefined
          }
          icon={<Smartphone size={18} />}
          isLoading={isLoading}
          isSelected={
            selectedPlatform === "ios" || selectedPlatform === "android"
          }
          onClick={() =>
            setSelectedPlatform((p) =>
              p === "ios" || p === "android" ? null : "ios",
            )
          }
        />
      </div>

      {selectedPlatform && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-700">
              {selectedPlatform === "web" ? "Web" : "Mobile"} エラー詳細
            </h4>
            {(selectedPlatform === "ios" || selectedPlatform === "android") && (
              <div className="flex gap-1">
                <PlatformTab
                  label="iOS"
                  isActive={selectedPlatform === "ios"}
                  onClick={() => setSelectedPlatform("ios")}
                />
                <PlatformTab
                  label="Android"
                  isActive={selectedPlatform === "android"}
                  onClick={() => setSelectedPlatform("android")}
                />
              </div>
            )}
          </div>
          <ClientErrorDetailList details={details} isLoading={detailsLoading} />
        </div>
      )}
    </div>
  );
}

function PlatformCard({
  label,
  count,
  subtitle,
  icon,
  isLoading,
  isSelected,
  onClick,
}: {
  label: string;
  count: number;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const border = isSelected
    ? "border-blue-500 bg-blue-50"
    : count > 0
      ? "border-orange-200 bg-orange-50"
      : "border-gray-200 bg-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${border} hover:border-blue-400`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {isLoading ? (
          <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-200" />
        ) : (
          count
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </button>
  );
}

function PlatformTab({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const style = isActive
    ? "bg-blue-600 text-white"
    : "bg-gray-100 text-gray-600 hover:bg-gray-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-xs font-medium ${style}`}
    >
      {label}
    </button>
  );
}
