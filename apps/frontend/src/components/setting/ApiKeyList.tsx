import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import type { ApiKeyResponse } from "@packages/types/response";
import dayjs from "dayjs";
import { Loader2, Trash2 } from "lucide-react";

import { ScopeBadges } from "./ScopeBadges";

export function ApiKeyList({
  apiKeys,
  isLoading,
  onDelete,
}: {
  apiKeys: ApiKeyResponse[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const { t } = useTranslation("settings");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return <p className="text-sm text-gray-400 py-2">{t("noApiKeys")}</p>;
  }

  return (
    <div className="space-y-2">
      {apiKeys.map((apiKey) => (
        <div
          key={apiKey.id}
          className="border border-gray-100 rounded-lg p-3 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {apiKey.name}
            </span>
            {confirmDeleteId === apiKey.id ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDelete(apiKey.id)}
                  disabled={deletingId === apiKey.id}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deletingId === apiKey.id ? "..." : t("apiKeyDeleteConfirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  {t("apiKeyDeleteCancel")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(apiKey.id)}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <ScopeBadges scopes={apiKey.scopes} />
          <div className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded select-none">
            {apiKey.key.startsWith("api_")
              ? apiKey.key
              : `${"*".repeat(8)}...${apiKey.key.slice(-4)}`}
          </div>
          <div className="flex gap-3 text-xs text-gray-400">
            <span>
              {t("apiKeyCreated")}:{" "}
              {dayjs(apiKey.createdAt).format("YYYY/MM/DD")}
            </span>
            {apiKey.lastUsedAt && (
              <span>
                {t("apiKeyLastUsed")}:{" "}
                {dayjs(apiKey.lastUsedAt).format("YYYY/MM/DD")}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
