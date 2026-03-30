import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Crown, Loader2 } from "lucide-react";

import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../subscription/UpgradeModal";
import { useUpgrade } from "../subscription/useUpgrade";

export function SubscriptionSection() {
  const { data: subscription, isLoading } = useSubscription();
  const upgrade = useUpgrade();
  const { t } = useTranslation("settings");

  if (isLoading) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Crown size={14} />
          {t("plan")}
        </h2>
        <div className="rounded-xl border border-gray-200 p-6 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  const isPremium = subscription?.plan === "premium";
  const periodEnd = subscription?.currentPeriodEnd
    ? dayjs(subscription.currentPeriodEnd).format("YYYY/MM/DD")
    : null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Crown size={14} />
        {t("plan")}
      </h2>
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                isPremium
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {isPremium ? t("planPro") : t("planFree")}
            </span>
            {subscription?.status === "trial" && (
              <span className="text-xs text-blue-600 font-medium">
                {t("trialStatus")}
              </span>
            )}
          </div>
        </div>

        {isPremium && periodEnd && (
          <p className="text-sm text-gray-500">
            {t("nextUpdateDate")}: {periodEnd}
          </p>
        )}

        {!isPremium && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 leading-relaxed">
              {t("upgradeText")}
            </p>
            <button
              type="button"
              onClick={upgrade.openUpgradeModal}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Crown size={14} />
              {t("upgradeButton")}
            </button>
          </div>
        )}
      </div>

      {upgrade.isModalOpen && (
        <UpgradeModal
          onClose={upgrade.closeUpgradeModal}
          onUpgrade={upgrade.startCheckout}
          isLoading={upgrade.isCheckoutLoading}
          error={upgrade.checkoutError}
        />
      )}
    </section>
  );
}
