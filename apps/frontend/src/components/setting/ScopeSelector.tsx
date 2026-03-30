import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";
import { useTranslation } from "@packages/i18n";

const GRANULAR_SCOPES = [
  { scope: "activity-logs:read", labelKey: "apiKeyScopeActivityLogsRead" },
  { scope: "activity-logs:write", labelKey: "apiKeyScopeActivityLogsWrite" },
  { scope: "tasks:read", labelKey: "apiKeyScopeTasksRead" },
  { scope: "tasks:write", labelKey: "apiKeyScopeTasksWrite" },
  { scope: "voice", labelKey: "apiKeyScopeVoice" },
] as const satisfies readonly { scope: ApiKeyScope; labelKey: string }[];

export function ScopeSelector({
  selectedScopes,
  onChange,
}: {
  selectedScopes: ApiKeyScope[];
  onChange: (scopes: ApiKeyScope[]) => void;
}) {
  const { t } = useTranslation("settings");
  const isAll = selectedScopes.includes("all");

  const handleToggle = (scope: ApiKeyScope) => {
    if (scope === "all") {
      onChange(isAll ? [] : ["all"]);
      return;
    }
    if (isAll) return;

    const next = selectedScopes.includes(scope)
      ? selectedScopes.filter((s) => s !== scope)
      : [...selectedScopes, scope];
    onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-2">
        {t("apiKeyScopes")}
      </label>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAll}
            onChange={() => handleToggle("all")}
            className="rounded border-gray-300 text-black focus:ring-black"
          />
          <span className="text-sm font-medium">{t("apiKeyScopeAll")}</span>
        </label>
        <div className="border-t border-gray-100 my-1" />
        {GRANULAR_SCOPES.map(({ scope, labelKey }) => (
          <label
            key={scope}
            className={`flex items-center gap-2 ${isAll ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              checked={isAll || selectedScopes.includes(scope)}
              disabled={isAll}
              onChange={() => handleToggle(scope)}
              className="rounded border-gray-300 text-black focus:ring-black"
            />
            <span className="text-sm">{t(labelKey)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
