import { Check, Crown, Loader2, X } from "lucide-react";

import { ModalOverlay } from "../common/ModalOverlay";

type UpgradeModalProps = {
  onClose: () => void;
  onUpgrade: () => void;
  isLoading: boolean;
  error: Error | null;
};

const FREE_FEATURES = [
  "活動の記録（無制限）",
  "目標の設定（無制限）",
  "統計・グラフ表示",
  "CSV インポート / エクスポート",
];

const PRO_FEATURES = [
  "Free の全機能",
  "API キーの発行・管理",
  "音声での記録（予定）",
  "Apple Watch 対応（予定）",
  "ウィジェット無制限（予定）",
];

export function UpgradeModal({
  onClose,
  onUpgrade,
  isLoading,
  error,
}: UpgradeModalProps) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm mx-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold">Pro にアップグレード</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <PlanColumn title="Free" features={FREE_FEATURES} />
            <PlanColumn title="Pro" features={PRO_FEATURES} highlighted />
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold">
              ¥550
              <span className="text-sm font-normal text-gray-500">/月</span>
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">
              エラーが発生しました。もう一度お試しください。
            </p>
          )}

          <button
            type="button"
            onClick={onUpgrade}
            disabled={isLoading}
            className="w-full py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                処理中...
              </>
            ) : (
              "アップグレード"
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            あとで
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

type PlanColumnProps = {
  title: string;
  features: string[];
  highlighted?: boolean;
};

function PlanColumn({ title, features, highlighted }: PlanColumnProps) {
  return (
    <div
      className={`rounded-xl p-3 ${highlighted ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-gray-200"}`}
    >
      <h3
        className={`text-sm font-semibold mb-2 ${highlighted ? "text-amber-700" : "text-gray-600"}`}
      >
        {title}
      </h3>
      <ul className="space-y-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-1.5">
            <Check
              size={14}
              className={`shrink-0 mt-0.5 ${highlighted ? "text-amber-500" : "text-gray-400"}`}
            />
            <span className="text-xs text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
