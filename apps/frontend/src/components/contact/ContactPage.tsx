import { useTranslation } from "@packages/i18n";

import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { useContactForm } from "./useContactForm";

const CATEGORIES = ["bug_report", "account_deletion", "other"] as const;

export function ContactPage() {
  const { t } = useTranslation("contact");
  const {
    email,
    category,
    body,
    isSubmitting,
    isSuccess,
    error,
    charCount,
    setEmail,
    setCategory,
    setBody,
    handleSubmit,
  } = useContactForm();

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-gray-800 font-medium">{t("contact.success")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">
          {t("contact.title")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("contact.email")}
            </label>
            <FormInput
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("contact.emailPlaceholder")}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="contact-category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("contact.category")}
            </label>
            <select
              id="contact-category"
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value as
                    | "bug_report"
                    | "account_deletion"
                    | "other"
                    | "",
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("contact.categoryDefault")}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`contact.categoryOptions.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="contact-body"
                className="block text-sm font-medium text-gray-700"
              >
                {t("contact.body")}
              </label>
              <span className="text-xs text-gray-400">
                {t("contact.charCount", { count: charCount })}
              </span>
            </div>
            <FormTextarea
              id="contact-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("contact.bodyPlaceholder")}
              required
              maxLength={1000}
              rows={5}
            />
          </div>

          {/* Error */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {isSubmitting ? t("contact.submitting") : t("contact.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
