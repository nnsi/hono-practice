import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Loader2 } from "lucide-react";

import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from "../../hooks/useApiKeys";
import { useSubscription } from "../../hooks/useSubscription";
import { EntitlementGate } from "../subscription/EntitlementGate";
import { UpgradeModal } from "../subscription/UpgradeModal";
import { useUpgrade } from "../subscription/useUpgrade";
import { ApiKeyList } from "./ApiKeyList";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";

export function ApiKeyManager() {
  const { t } = useTranslation("settings");
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const canUseApiKey = subscription?.canUseApiKey ?? false;
  const { data: apiKeysData, isLoading: keysLoading } = useApiKeys({
    enabled: canUseApiKey,
  });
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const upgrade = useUpgrade();

  if (subLoading) {
    return (
      <div className="rounded-xl border border-gray-200 p-6 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <EntitlementGate feature="apiKey" onUpgrade={upgrade.openUpgradeModal}>
        <div className="rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{t("apiKeyManagement")}</p>
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="shrink-0 px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              {t("createNewKey")}
            </button>
          </div>

          <ApiKeyList
            apiKeys={apiKeysData?.apiKeys ?? []}
            isLoading={keysLoading}
            onDelete={deleteApiKey.mutateAsync}
          />

          {showCreateDialog && (
            <CreateApiKeyDialog
              onClose={() => setShowCreateDialog(false)}
              onCreate={createApiKey.mutateAsync}
            />
          )}
        </div>
      </EntitlementGate>

      {upgrade.isModalOpen && (
        <UpgradeModal
          onClose={upgrade.closeUpgradeModal}
          onUpgrade={upgrade.startCheckout}
          isLoading={upgrade.isCheckoutLoading}
          error={upgrade.checkoutError}
        />
      )}
    </>
  );
}
