import { useState } from "react";

import { useTranslation } from "@packages/i18n";

import { LegalModal } from "../common/LegalModal";
import { AppleSignInButton } from "./AppleSignInButton";
import { GoogleSignInButton } from "./GoogleSignInButton";

type CreateUserFormProps = {
  onRegister: (loginId: string, password: string) => Promise<void>;
  onGoogleLogin: (credential: string) => Promise<void>;
  onAppleLogin: (credential: string) => Promise<void>;
};

export function CreateUserForm({
  onRegister,
  onGoogleLogin,
  onAppleLogin,
}: CreateUserFormProps) {
  const { t } = useTranslation("common");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );

  const validate = (): string | null => {
    if (!loginId.trim()) return t("auth.loginIdRequired");
    if (!password) return t("auth.passwordRequired");
    if (password.length < 8) return t("auth.passwordMinLength");
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onRegister(loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.registerError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      await onGoogleLogin(credential);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.googleRegisterError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError(t("auth.googleRegisterError"));
  };

  const handleAppleSuccess = async (credential: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      await onAppleLogin(credential);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.appleRegisterError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleError = () => {
    setError(t("auth.appleRegisterError"));
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3">
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="signup_with"
        />
      </div>
      <div className="mb-6">
        <AppleSignInButton
          onSuccess={handleAppleSuccess}
          onError={handleAppleError}
          text="signup"
        />
      </div>

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
          <input
            id="register-loginId"
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none transition-all"
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
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none transition-all"
            required
            minLength={8}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <p className="text-xs text-gray-400 leading-relaxed">
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
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isSubmitting ? t("auth.registering") : t("auth.signUp")}
        </button>
      </form>
      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
