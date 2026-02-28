import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { useSubscription } from "../../hooks/useSubscription";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "../../hooks/useApiKeys";
import { ApiKeyList } from "./ApiKeyList";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";

export function ApiKeyManager() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const canUseApiKey = subscription?.canUseApiKey ?? false;
  const { data: apiKeysData, isLoading: keysLoading } = useApiKeys({ enabled: canUseApiKey });
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (subLoading) {
    return (
      <div className="rounded-xl border border-gray-200 p-6 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!subscription?.canUseApiKey) {
    return (
      <div className="rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-center gap-2 text-gray-500">
          <Lock size={16} />
          <span className="text-sm font-medium">プレミアムプラン限定機能</span>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          APIキー機能はプレミアムプラン以上のユーザーのみご利用いただけます。プランをアップグレードすることで、外部アプリケーションからのアクセスが可能になります。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          外部アプリケーションからアクセスするためのAPIキーを管理します
        </p>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="shrink-0 px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          + 新規作成
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
  );
}
