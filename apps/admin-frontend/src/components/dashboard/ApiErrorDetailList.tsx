type ApiErrorDetail = {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  error: string;
  durationMs: number;
};

export function ApiErrorDetailList({
  details,
  isLoading,
}: {
  details: ApiErrorDetail[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!details || details.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">エラーなし</p>;
  }

  return (
    <div className="space-y-2">
      {details.map((d) => (
        <ApiErrorRow key={`${d.timestamp}-${d.path}`} detail={d} />
      ))}
    </div>
  );
}

function ApiErrorRow({ detail }: { detail: ApiErrorDetail }) {
  const time = new Date(detail.timestamp).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusColor =
    detail.status >= 500
      ? "bg-red-100 text-red-700"
      : "bg-orange-100 text-orange-700";

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor}`}
          >
            {detail.status}
          </span>
          <span className="text-xs font-medium text-gray-600">
            {detail.method}
          </span>
          <span className="text-xs text-gray-500">{detail.path}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{detail.durationMs}ms</span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
      </div>
      {detail.error && <p className="text-sm text-gray-700">{detail.error}</p>}
    </div>
  );
}
