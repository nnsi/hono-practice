import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { ModalOverlay } from "../common/ModalOverlay";
import type { CreateApiKeyRequest } from "@dtos/request";
import type { CreateApiKeyResponse } from "@dtos/response";

export function CreateApiKeyDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onCreate({ name: name.trim() });
      setCreatedKey(result.apiKey.key);
    } catch {
      setError("APIキーの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            {createdKey ? "APIキーが作成されました" : "新しいAPIキーの作成"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {createdKey ? (
          <div className="space-y-4">
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              このAPIキーは一度しか表示されません。必ずコピーして安全に保管してください。
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <code className="text-sm break-all text-gray-800">
                {createdKey}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  コピーしました
                </>
              ) : (
                <>
                  <Copy size={16} />
                  APIキーをコピー
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 開発用APIキー"
                autoFocus
                maxLength={255}
              />
              <p className="text-xs text-gray-400 mt-1">
                APIキーに識別しやすい名前を付けてください
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "作成中..." : "作成"}
            </button>
          </form>
        )}
      </div>
    </ModalOverlay>
  );
}
