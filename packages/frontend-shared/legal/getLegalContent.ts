import {
  commercialTransactionsTitle,
  createCommercialTransactionsSections,
} from "./commercialTransactions";
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
};

/**
 * Get legal document content for the given type and locale.
 * Currently only Japanese is available. When English versions
 * are ready, add en/ files and switch based on locale.
 */
export function getLegalContent(
  type: LegalType,
  _locale: string,
  options: Options,
): LegalContent {
  // TODO: switch on _locale when English legal documents are available
  switch (type) {
    case "privacy":
      return {
        title: privacyPolicyTitle,
        sections: createPrivacyPolicySections(options),
      };
    case "terms":
      return {
        title: termsOfServiceTitle,
        sections: termsOfServiceSections,
      };
    case "tokushoho":
      return {
        title: commercialTransactionsTitle,
        sections: createCommercialTransactionsSections(options),
      };
  }
}
