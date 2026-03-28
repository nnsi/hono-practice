import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { AlertTriangle, Check, UserCircle } from "lucide-react";

import { db } from "../../db/schema";
import { apiClient, clearToken } from "../../utils/apiClient";
import { AppleSignInButton } from "../root/AppleSignInButton";
import { GoogleSignInButton } from "../root/GoogleSignInButton";
import { useAppleAccount, useGoogleAccount } from "./useAccountLinking";
import { clearAppSettings } from "./useAppSettings";

export function AccountSection() {
  const google = useGoogleAccount();
  const apple = useAppleAccount();
  const { t } = useTranslation("settings");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      await apiClient.user.me.$delete();
    } catch {
      // オフライン時もローカル削除は続行
    }
    await db.delete();
    clearToken();
    clearAppSettings();
    window.location.href = "/";
  };

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <UserCircle size={14} />
        {t("account")}
      </h2>
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        {google.isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-48" />
          </div>
        ) : (
          <>
            {google.isGoogleLinked && (
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-700">
                    {t("googleLinked")}
                  </p>
                  {google.googleEmail && (
                    <p className="text-xs text-gray-500 truncate">
                      {google.googleEmail}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {!google.isGoogleLinked && (
                <p className="text-sm text-gray-600">
                  {t("googleLinkDescription")}
                </p>
              )}
              <GoogleSignInButton
                onSuccess={google.linkGoogle}
                onError={() => {}}
              />
              {google.isLinking && (
                <p className="text-xs text-gray-500">{t("linking")}</p>
              )}
            </div>
          </>
        )}
        {google.message && (
          <p
            className={`text-xs ${google.message.type === "success" ? "text-green-600" : "text-red-500"}`}
          >
            {google.message.text}
          </p>
        )}
        <div className="border-t border-gray-100 mt-3 pt-3">
          {apple.isLoading ? (
            <div className="animate-pulse h-4 bg-gray-100 rounded w-32" />
          ) : (
            <div className="space-y-2">
              {apple.isAppleLinked && (
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-green-700">
                      {t("appleLinked")}
                    </p>
                    {apple.appleEmail && (
                      <p className="text-xs text-gray-500 truncate">
                        {apple.appleEmail}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!apple.isAppleLinked && (
                <p className="text-sm text-gray-600">
                  {t("appleLinkDescription")}
                </p>
              )}
              <AppleSignInButton
                onSuccess={apple.linkApple}
                onError={() => {}}
              />
              {apple.isLinking && (
                <p className="text-xs text-gray-500">{t("linking")}</p>
              )}
              {apple.message && (
                <p
                  className={`text-xs ${apple.message.type === "success" ? "text-green-600" : "text-red-500"}`}
                >
                  {apple.message.text}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <AlertTriangle size={16} />
              {t("deleteAccount")}
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">
                {t("deleteAccountConfirm")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {t("deleteAccountButton")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
