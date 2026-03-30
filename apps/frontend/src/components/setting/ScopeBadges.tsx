import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";
import { useTranslation } from "@packages/i18n";

function useScopeLabel() {
  const { t } = useTranslation("settings");
  return (scope: ApiKeyScope): string => {
    switch (scope) {
      case "all":
        return t("apiKeyScopeAll");
      case "activity-logs:read":
        return t("apiKeyScopeActivityLogsRead");
      case "activity-logs:write":
        return t("apiKeyScopeActivityLogsWrite");
      case "tasks:read":
        return t("apiKeyScopeTasksRead");
      case "tasks:write":
        return t("apiKeyScopeTasksWrite");
      case "voice":
        return t("apiKeyScopeVoice");
    }
  };
}

export function ScopeBadges({ scopes }: { scopes: ApiKeyScope[] }) {
  const getScopeLabel = useScopeLabel();

  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((scope) => (
        <span
          key={scope}
          className="inline-block text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
        >
          {getScopeLabel(scope)}
        </span>
      ))}
    </div>
  );
}
