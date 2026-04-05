import {
  commercialTransactionsTitle,
  createCommercialTransactionsSections,
  createPrivacyPolicySections,
  privacyPolicyEffectiveDate,
  privacyPolicyTitle,
  termsOfServiceEffectiveDate,
  termsOfServiceSections,
  termsOfServiceTitle,
} from "@packages/frontend-shared/legal";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { useNoIndex } from "../../hooks/useNoIndex";

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "";
const ADMINISTRATOR_NAME = import.meta.env.VITE_ADMINISTRATOR_NAME || "";
const CONTACT_PATH = "/contact";

function renderContent(content: string) {
  const idx = content.indexOf(CONTACT_PATH);
  if (idx === -1) return content;
  const before = content.slice(0, idx);
  const after = content.slice(idx + CONTACT_PATH.length);
  return (
    <>
      {before}
      <Link
        to="/contact"
        className="text-blue-600 hover:text-blue-700 underline"
      >
        {CONTACT_PATH}
      </Link>
      {after}
    </>
  );
}

type LegalPageProps = {
  type: "privacy" | "terms" | "tokushoho";
};

const titleMap = {
  privacy: privacyPolicyTitle,
  terms: termsOfServiceTitle,
  tokushoho: commercialTransactionsTitle,
} as const;

const effectiveDateMap = {
  privacy: privacyPolicyEffectiveDate,
  terms: termsOfServiceEffectiveDate,
  tokushoho: undefined,
} as const;

function getSections(type: LegalPageProps["type"]) {
  switch (type) {
    case "privacy":
      return createPrivacyPolicySections({
        contactEmail: CONTACT_EMAIL,
        contactUrl: CONTACT_PATH,
        administratorName: ADMINISTRATOR_NAME,
      });
    case "terms":
      return termsOfServiceSections;
    case "tokushoho":
      return createCommercialTransactionsSections({
        contactEmail: CONTACT_EMAIL,
        administratorName: ADMINISTRATOR_NAME,
      });
  }
}

export function LegalPage({ type }: LegalPageProps) {
  useNoIndex();
  const navigate = useNavigate();
  const title = titleMap[type];
  const effectiveDate = effectiveDateMap[type];
  const sections = getSections(type);

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
        <h1 className="text-xl font-bold mb-1">{title}</h1>
        {effectiveDate && (
          <p className="text-xs text-gray-500 mb-6">{effectiveDate}</p>
        )}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-semibold text-base mb-1">{section.title}</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {renderContent(section.content)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
