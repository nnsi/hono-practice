import { useState } from "react";

import {
  privacyPolicyVersion,
  termsOfServiceVersion,
} from "@packages/frontend-shared/legal";
import { useTranslation } from "@packages/i18n";
import type { Consents } from "@packages/types/request";

type UseCreateUserFormProps = {
  onRegister: (
    loginId: string,
    password: string,
    consents: Consents,
  ) => Promise<void>;
  onGoogleLogin: (credential: string, consents?: Consents) => Promise<void>;
  onAppleLogin: (credential: string, consents?: Consents) => Promise<void>;
};

export function useCreateUserForm({
  onRegister,
  onGoogleLogin,
  onAppleLogin,
}: UseCreateUserFormProps) {
  const { t } = useTranslation("common");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );

  const buildConsents = (): Consents => ({
    age: true,
    terms: termsOfServiceVersion,
    privacy: privacyPolicyVersion,
  });

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
      await onRegister(loginId, password, buildConsents());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.registerError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      await onGoogleLogin(credential, buildConsents());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.googleRegisterError"),
      );
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
      await onAppleLogin(credential, buildConsents());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.appleRegisterError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleError = () => {
    setError(t("auth.appleRegisterError"));
  };

  return {
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
  };
}
