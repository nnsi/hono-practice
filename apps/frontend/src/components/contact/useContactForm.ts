import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { useNavigate } from "@tanstack/react-router";

import { apiClient } from "../../utils/apiClient";

type Category = "bug_report" | "account_deletion" | "other" | "";

type ContactFormState = {
  email: string;
  category: Category;
  body: string;
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string;
  charCount: number;
};

type ContactFormHandlers = {
  setEmail: (v: string) => void;
  setCategory: (v: Category) => void;
  setBody: (v: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function useContactForm(): ContactFormState & ContactFormHandlers {
  const { t } = useTranslation("contact");
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await apiClient.contact.$post({
        json: {
          email,
          body,
          ...(category !== "" ? { category } : {}),
        },
      });

      if (!res.ok) {
        const rawRes = res as unknown as Response;
        const message =
          rawRes.status === 429
            ? t("contact.rateLimitError")
            : "An error occurred. Please try again.";
        throw new Error(message);
      }

      setIsSuccess(true);
      setTimeout(() => {
        navigate({ to: "/" });
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.",
      );
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
