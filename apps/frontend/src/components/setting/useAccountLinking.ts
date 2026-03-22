import { useCallback, useEffect, useState } from "react";

import { apiClient } from "../../utils/apiClient";

type LinkMessage = { type: "success" | "error"; text: string } | null;

export function useGoogleAccount() {
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<LinkMessage>(null);

  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await apiClient.user.me.$get();
      if (!res.ok) return;
      const user = await res.json();
      setIsGoogleLinked(user.providers?.includes("google") ?? false);
      setGoogleEmail(user.providerEmails?.google ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const linkGoogle = async (credential: string) => {
    setIsLinking(true);
    setMessage(null);
    try {
      const res = await apiClient.auth.google.link.$post({
        json: { credential },
      });
      if (!res.ok) {
        setMessage({ type: "error", text: "Google連携に失敗しました" });
        return;
      }
      setMessage({ type: "success", text: "Google連携が完了しました" });
      await fetchUserInfo();
    } catch {
      setMessage({ type: "error", text: "Google連携に失敗しました" });
    } finally {
      setIsLinking(false);
    }
  };

  return {
    isGoogleLinked,
    googleEmail,
    isLoading,
    isLinking,
    message,
    linkGoogle,
  };
}

export function useAppleAccount() {
  const [isAppleLinked, setIsAppleLinked] = useState(false);
  const [appleEmail, setAppleEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<LinkMessage>(null);

  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await apiClient.user.me.$get();
      if (!res.ok) return;
      const user = await res.json();
      setIsAppleLinked(user.providers?.includes("apple") ?? false);
      setAppleEmail(user.providerEmails?.apple ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const linkApple = async (credential: string) => {
    setIsLinking(true);
    setMessage(null);
    try {
      const res = await apiClient.auth.apple.link.$post({
        json: { credential },
      });
      if (!res.ok) {
        setMessage({ type: "error", text: "Apple連携に失敗しました" });
        return;
      }
      setMessage({ type: "success", text: "Apple連携が完了しました" });
      await fetchUserInfo();
    } catch {
      setMessage({ type: "error", text: "Apple連携に失敗しました" });
    } finally {
      setIsLinking(false);
    }
  };

  return {
    isAppleLinked,
    appleEmail,
    isLoading,
    isLinking,
    message,
    linkApple,
  };
}
