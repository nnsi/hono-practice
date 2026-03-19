import {
  createPrivacyPolicySections,
  privacyPolicyTitle,
  termsOfServiceSections,
  termsOfServiceTitle,
} from "@packages/frontend-shared/legal";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "";

type LegalPageProps = {
  type: "privacy" | "terms";
};

export function LegalPage({ type }: LegalPageProps) {
  const navigate = useNavigate();
  const title = type === "privacy" ? privacyPolicyTitle : termsOfServiceTitle;
  const sections =
    type === "privacy"
      ? createPrivacyPolicySections({ contactEmail: CONTACT_EMAIL })
      : termsOfServiceSections;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          戻る
        </button>
        <h1 className="text-xl font-bold mb-6">{title}</h1>
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-semibold text-base mb-1">{section.title}</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
