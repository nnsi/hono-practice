import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { useRouter } from "expo-router";

import { customFetch, getApiUrl } from "../../utils/apiClient";

type Category = "bug_report" | "account_deletion" | "other" | "";

type UseContactFormReturn = {
  email: string;
  category: Category;
  body: string;
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string;
  charCount: number;
  setEmail: (v: string) => void;
  setCategory: (v: Category) => void;
  setBody: (v: string) => void;
  handleSubmit: () => Promise<void>;
};

const API_URL = getApiUrl();

export function useContactForm(): UseContactFormReturn {
  const { t } = useTranslation("contact");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await customFetch(`${API_URL}/contact`, {
        method: "POST",
        body: JSON.stringify({
          email,
          category: category || undefined,
          body,
        }),
      });

      if (res.status === 429) {
        setError(t("contact.rateLimitError"));
        return;
      }

      if (!res.ok) {
        setError(t("contact.genericError"));
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch {
      setError(t("contact.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    category,
    body,
    isSubmitting,
    isSuccess,
    error,
    charCount: body.length,
    setEmail,
    setCategory,
    setBody,
    handleSubmit,
  };
}
