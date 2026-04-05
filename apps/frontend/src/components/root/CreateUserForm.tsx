import type { Consents } from "@packages/types/request";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { LegalModal } from "../common/LegalModal";
import { AppleSignInButton } from "./AppleSignInButton";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useCreateUserForm } from "./useCreateUserForm";

type CreateUserFormProps = {
  onRegister: (
    loginId: string,
    password: string,
    consents: Consents,
  ) => Promise<void>;
  onGoogleLogin: (credential: string, consents?: Consents) => Promise<void>;
  onAppleLogin: (credential: string, consents?: Consents) => Promise<void>;
};

export function CreateUserForm({
  onRegister,
  onGoogleLogin,
  onAppleLogin,
}: CreateUserFormProps) {
  const {
    t,
    loginId,
    setLoginId,
    password,
    setPassword,
    consentChecked,
    setConsentChecked,
    error,
    isSubmitting,
    legalModal,
    setLegalModal,
    handleSubmit,
    handleGoogleSuccess,
    handleGoogleError,
    handleAppleSuccess,
    handleAppleError,
  } = useCreateUserForm({ onRegister, onGoogleLogin, onAppleLogin });

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3">
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="signup_with"
        />
      </div>
      <div className="mb-3">
        <AppleSignInButton
          onSuccess={handleAppleSuccess}
          onError={handleAppleError}
          text="signup"
        />
      </div>
      <p className="mb-6 text-xs text-gray-400 leading-relaxed">
        {t("auth.oauthConsent")}
      </p>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-100 px-3 text-gray-400 text-xs">
            {t("auth.or")}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="register-loginId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("auth.loginId")}
          </label>
          <FormInput
            id="register-loginId"
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            htmlFor="register-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("auth.password")}
            <span className="text-gray-400 text-xs ml-1">
              {t("auth.passwordHint").replace(t("auth.password"), "")}
            </span>
          </label>
          <FormInput
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 shrink-0"
            required
          />
          <span className="text-xs text-gray-400 leading-relaxed">
            {t("auth.legalConsentPrefix")}
            <button
              type="button"
              onClick={() => setLegalModal("terms")}
              className="underline hover:text-gray-600 transition-colors"
            >
              {t("auth.termsOfService")}
            </button>
            {t("auth.legalConsentAnd")}
            <button
              type="button"
              onClick={() => setLegalModal("privacy")}
              className="underline hover:text-gray-600 transition-colors"
            >
              {t("auth.privacyPolicy")}
            </button>
            {t("auth.legalConsentSuffix")}
          </span>
        </label>
        <FormButton
          type="submit"
          variant="primary"
          label={isSubmitting ? t("auth.registering") : t("auth.signUp")}
          disabled={isSubmitting || !consentChecked}
          className="w-full"
        />
      </form>
      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
