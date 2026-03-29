import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { adminClient } from "../../utils/apiClient";
import { ApiErrorDetailList } from "./ApiErrorDetailList";

type WaeApmData = {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  badRequestCount: number;
  avgResponseTimeMs: number;
};

type ErrorKind = "5xx" | "400";

type Props = {
  apm: WaeApmData | undefined;
};

export function ApmSection({ apm }: Props) {
  const [selectedKind, setSelectedKind] = useState<ErrorKind | null>(null);

  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin", "api-errors", selectedKind],
    queryFn: async () => {
      const res = await adminClient.admin["api-errors"][":kind"].$get({
        param: { kind: selectedKind! },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    enabled: !!selectedKind,
  });

  const toggle = (kind: ErrorKind) =>
    setSelectedKind((prev) => (prev === kind ? null : kind));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        WAE-APM（直近24時間）
      </h3>
      <div className="space-y-3">
        <ApmRow
          label="総リクエスト数"
          value={apm?.totalRequests ? apm.totalRequests.toLocaleString() : "--"}
        />
        <ApmRow
          label="エラー件数"
          value={apm?.errorCount?.toString() ?? "--"}
          alert={!!apm && apm.errorCount > 0}
          clickable={!!apm && apm.errorCount > 0}
          isSelected={selectedKind === "5xx"}
          onClick={() => toggle("5xx")}
        />
        <ApmRow
          label="400 Bad Request"
          value={apm?.badRequestCount?.toString() ?? "--"}
          alert={!!apm && apm.badRequestCount > 0}
          clickable={!!apm && apm.badRequestCount > 0}
          isSelected={selectedKind === "400"}
          onClick={() => toggle("400")}
        />
        <ApmRow
          label="エラーレート"
          value={apm?.totalRequests ? `${apm.errorRate}%` : "--"}
          alert={!!apm && apm.errorRate > 1}
        />
        <ApmRow
          label="平均レスポンスタイム"
          value={apm?.avgResponseTimeMs ? `${apm.avgResponseTimeMs} ms` : "--"}
          alert={!!apm && apm.avgResponseTimeMs > 500}
        />
      </div>
      {!apm?.totalRequests && (
        <p className="mt-4 text-xs text-gray-400">
          CF_API_TOKEN未設定、またはデータなし
        </p>
      )}

      {selectedKind && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            {selectedKind === "5xx" ? "5xx サーバーエラー" : "400 Bad Request"}{" "}
            詳細
          </h4>
          <ApiErrorDetailList details={details} isLoading={detailsLoading} />
        </div>
      )}
    </div>
  );
}

function ApmRow({
  label,
  value,
  alert,
  clickable,
  isSelected,
  onClick,
}: {
  label: string;
  value: string;
  alert?: boolean;
  clickable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const bg = isSelected
    ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
    : alert
      ? "bg-red-50 text-red-700"
      : "bg-blue-50 text-blue-700";

  const cursor = clickable ? "cursor-pointer hover:opacity-80" : "";

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`flex w-full items-center justify-between rounded-lg px-4 py-3 ${bg} ${cursor} disabled:cursor-default`}
    >
      <span className="text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </button>
  );
}
