import {
  commercialTransactionsTitle,
  createCommercialTransactionsSections,
} from "./commercialTransactions";
import {
  createPrivacyPolicySectionsEn,
  privacyPolicyTitleEn,
} from "./en/privacyPolicy";
import {
  termsOfServiceSectionsEn,
  termsOfServiceTitleEn,
} from "./en/termsOfService";
import type { LegalSection } from "./privacyPolicy";
import {
  createPrivacyPolicySections,
  privacyPolicyTitle,
} from "./privacyPolicy";
import { termsOfServiceSections, termsOfServiceTitle } from "./termsOfService";

export type LegalType = "privacy" | "terms" | "tokushoho";

type LegalContent = {
  title: string;
  sections: LegalSection[];
};

type Options = {
  contactEmail: string;
  contactUrl: string;
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
        ? { title: termsOfServiceTitleEn, sections: termsOfServiceSectionsEn }
        : { title: termsOfServiceTitle, sections: termsOfServiceSections };
    case "privacy":
      return isEnglish(locale)
        ? {
            title: privacyPolicyTitleEn,
            sections: createPrivacyPolicySectionsEn(options),
          }
        : {
            title: privacyPolicyTitle,
            sections: createPrivacyPolicySections(options),
          };
    case "tokushoho":
      return {
        title: commercialTransactionsTitle,
        sections: createCommercialTransactionsSections(options),
      };
  }
}
