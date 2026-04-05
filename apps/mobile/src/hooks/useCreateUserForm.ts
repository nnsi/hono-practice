import { useState } from "react";

import {
  privacyPolicyVersion,
  termsOfServiceVersion,
} from "@packages/frontend-shared/legal";
import { useTranslation } from "@packages/i18n";
import type { Consents } from "@packages/types/request";

import { useAuthContext } from "../../app/_layout";
import { useGoogleSignIn } from "./useGoogleSignIn";

export function useCreateUserForm() {
  const { t } = useTranslation("common");
  const { register, googleLogin, appleLogin } = useAuthContext();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );
  const [consentChecked, setConsentChecked] = useState(false);

  const oauthConsents: Consents = {
    age: true,
    terms: termsOfServiceVersion,
    privacy: privacyPolicyVersion,
  };

  const { googleRequest, handleGooglePress } = useGoogleSignIn({
    onLogin: (idToken, consents) => googleLogin(idToken, consents),
    onError: setError,
    consents: oauthConsents,
  });

  const handleRegister = async () => {
    if (!loginId || !password) {
      setError(t("auth.idAndPasswordRequired"));
      return;
    }
    if (!consentChecked) return;
    setLoading(true);
    setError("");
    const consents: Consents = {
      age: true,
      terms: termsOfServiceVersion,
      privacy: privacyPolicyVersion,
    };
    try {
      await register(loginId, password, consents);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.registerError"));
    } finally {
      setLoading(false);
    }
  };

  const buildAppleConsents = (): Consents => ({
    age: true,
    terms: termsOfServiceVersion,
    privacy: privacyPolicyVersion,
  });

  return {
    t,
    loginId,
    setLoginId,
    password,
    setPassword,
    loading,
    error,
    setError,
    legalModal,
    setLegalModal,
    consentChecked,
    setConsentChecked,
    googleRequest,
    handleGooglePress,
    handleRegister,
    buildAppleConsents,
    appleLogin,
  };
}
