import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { useAuthContext } from "../../../app/_layout";
import { useGoogleSignIn } from "../../hooks/useGoogleSignIn";

WebBrowser.maybeCompleteAuthSession();

export function useLoginForm() {
  const { t } = useTranslation("common");
  const { login, googleLogin, appleLogin } = useAuthContext();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );

  const { googleRequest, handleGooglePress } = useGoogleSignIn({
    onLogin: googleLogin,
    onError: setError,
  });

  const handleLogin = async () => {
    if (!loginId || !password) {
      setError(t("auth.idAndPasswordRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleError = (e: unknown) => {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as { code: string }).code
        : "";
    if (code !== "ERR_REQUEST_CANCELED") {
      setError(e instanceof Error ? e.message : t("auth.appleLoginError"));
    }
  };

  return {
    t,
    loginId,
    setLoginId,
    password,
    setPassword,
    loading,
    error,
    legalModal,
    setLegalModal,
    googleRequest,
    handleGooglePress,
    handleLogin,
    appleLogin,
    handleAppleError,
    router,
  };
}
