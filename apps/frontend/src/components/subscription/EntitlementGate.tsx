import type { ReactNode } from "react";

import { Crown, Lock } from "lucide-react";

import { usePlan } from "../../hooks/usePlan";

type EntitlementFeature = "apiKey" | "voice" | "watch" | "widget";

type EntitlementGateProps = {
  feature: EntitlementFeature;
  children: ReactNode;
  fallback?: ReactNode;
  onUpgrade: () => void;
};

const FEATURE_LABELS: Record<EntitlementFeature, string> = {
  apiKey: "API キー管理",
  voice: "音声記録",
  watch: "Apple Watch 連携",
  widget: "ウィジェット無制限",
};

/**
 * Pro プラン限定機能のゲートコンポーネント。
 * free プランの場合はアップグレード促進 UI を表示する。
 */
export function EntitlementGate({
  feature,
  children,
  fallback,
  onUpgrade,
}: EntitlementGateProps) {
  const plan = usePlan();

  if (plan === "premium") {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2 text-gray-500">
        <Lock size={16} />
        <span className="text-sm font-medium">Pro プラン限定機能</span>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">
        {FEATURE_LABELS[feature]}は Pro
        プランでご利用いただけます。アップグレードして全機能をお使いください。
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        <Crown size={14} />
        Pro にアップグレード
      </button>
    </div>
  );
}
