import { useState } from "react";

import { useTranslation } from "@packages/i18n";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { AppleSignInButton } from "./AppleSignInButton";
import { GoogleSignInButton } from "./GoogleSignInButton";

type LoginFormProps = {
  onLogin: (loginId: string, password: string) => Promise<void>;
  onGoogleLogin: (credential: string) => Promise<void>;
  onAppleLogin: (credential: string) => Promise<void>;
};

export function LoginForm({
  onLogin,
  onGoogleLogin,
  onAppleLogin,
}: LoginFormProps) {
  const { t } = useTranslation("common");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onLogin(loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.loginError"));
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
      setError(e instanceof Error ? e.message : t("auth.googleLoginError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError(t("auth.googleLoginError"));
  };

  const handleAppleSuccess = async (credential: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      await onAppleLogin(credential);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.appleLoginError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleError = () => {
    setError(t("auth.appleLoginError"));
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3">
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />
      </div>
      <div className="mb-6">
        <AppleSignInButton
          onSuccess={handleAppleSuccess}
          onError={handleAppleError}
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
            htmlFor="loginId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("auth.loginId")}
          </label>
          <FormInput
            id="loginId"
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("auth.password")}
          </label>
          <FormInput
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <FormButton
          type="submit"
          variant="primary"
          label={isSubmitting ? t("auth.loggingIn") : t("auth.login")}
          disabled={isSubmitting}
          className="w-full"
        />
      </form>
    </div>
  );
}
