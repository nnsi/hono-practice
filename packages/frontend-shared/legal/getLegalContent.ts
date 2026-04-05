import {
  commercialTransactionsTitle,
  createCommercialTransactionsSections,
} from "./commercialTransactions";
import {
  createPrivacyPolicySectionsEn,
  privacyPolicyEffectiveDateEn,
  privacyPolicyTitleEn,
} from "./en/privacyPolicy";
import {
  termsOfServiceEffectiveDateEn,
  termsOfServiceSectionsEn,
  termsOfServiceTitleEn,
} from "./en/termsOfService";
import type { LegalSection } from "./privacyPolicy";
import {
  createPrivacyPolicySections,
  privacyPolicyEffectiveDate,
  privacyPolicyTitle,
} from "./privacyPolicy";
import {
  termsOfServiceEffectiveDate,
  termsOfServiceSections,
  termsOfServiceTitle,
} from "./termsOfService";

export type LegalType = "privacy" | "terms" | "tokushoho";

type LegalContent = {
  title: string;
  sections: LegalSection[];
  effectiveDate?: string;
};

type Options = {
  contactEmail: string;
  contactUrl: string;
  /**
   * 販売事業者の氏名（特商法表記で使用）。日本語の tokushoho ページ専用。
   * 特商法11条1号により個人事業主の氏名は常時表示必須。
   */
  administratorName: string;
};

function isEnglish(locale: string): boolean {
  return /^en(?:-|$)/i.test(locale);
}

/**
 * Get legal document content for the given type and locale.
 * English is available for: terms, privacy.
 * tokushoho is Japanese-law specific and has no English version.
 */
export function getLegalContent(
  type: LegalType,
  locale: string,
  options: Options,
): LegalContent {
  switch (type) {
    case "terms":
      return isEnglish(locale)
        ? {
            title: termsOfServiceTitleEn,
            sections: termsOfServiceSectionsEn,
            effectiveDate: termsOfServiceEffectiveDateEn,
          }
        : {
            title: termsOfServiceTitle,
            sections: termsOfServiceSections,
            effectiveDate: termsOfServiceEffectiveDate,
          };
    case "privacy":
      return isEnglish(locale)
        ? {
            title: privacyPolicyTitleEn,
            sections: createPrivacyPolicySectionsEn(options),
            effectiveDate: privacyPolicyEffectiveDateEn,
          }
        : {
            title: privacyPolicyTitle,
            sections: createPrivacyPolicySections(options),
            effectiveDate: privacyPolicyEffectiveDate,
          };
    case "tokushoho":
      return {
        title: commercialTransactionsTitle,
        sections: createCommercialTransactionsSections({
          contactEmail: options.contactEmail,
          administratorName: options.administratorName,
        }),
      };
  }
}
