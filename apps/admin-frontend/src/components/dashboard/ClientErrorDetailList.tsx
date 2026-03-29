type ClientErrorDetail = {
  timestamp: string;
  errorType: string;
  message: string;
  platform: string;
  screen: string;
};

export function ClientErrorDetailList({
  details,
  isLoading,
}: {
  details: ClientErrorDetail[] | undefined;
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
        <ErrorRow key={`${d.timestamp}-${d.errorType}`} detail={d} />
      ))}
    </div>
  );
}

function ErrorRow({ detail }: { detail: ClientErrorDetail }) {
  const time = new Date(detail.timestamp).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          {detail.errorType}
        </span>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
      <p className="text-sm text-gray-800">{detail.message}</p>
      {detail.screen && (
        <p className="mt-1 text-xs text-gray-500">画面: {detail.screen}</p>
      )}
    </div>
  );
}
