import type { LegalSection, PrivacyPolicyConfig } from "../privacyPolicy";

export const privacyPolicyTitleEn = "Privacy Policy";

export const createPrivacyPolicySectionsEn = (
  config: PrivacyPolicyConfig,
): LegalSection[] => [
  {
    title: "1. Introduction",
    content:
      "Actiko (the \u201cService\u201d) is operated by an individual based in Japan (the \u201cOperator\u201d). The Operator is based outside the EU/EEA and processes data from Japan. This Privacy Policy describes what information we collect, how we use it, and what rights you have regarding your data.",
  },
  {
    title: "2. Information We Collect",
    content:
      "We collect the following categories of information:\n\n" +
      "Account information: Login ID, password (stored as a cryptographic hash, never in plain text), and display name. This information is required to create and maintain your account; without it, you cannot use the Service.\n\n" +
      "Third-party authentication: If you sign in with Google, we receive your Google user ID, email address, and display name. If you sign in with Apple, we receive your Apple user ID, email address, and display name. When using Sign in with Apple, your email may be a private relay address depending on your settings.\n\n" +
      "Activity data: Activity names, dates, times, quantities, memos, goals, and other content you enter into the Service.\n\n" +
      "Access logs: Request timestamps, IP addresses, and user-agent strings, used for service operations and abuse detection.\n\n" +
      "Cookies: We use a single HTTP-only cookie to store your authentication refresh token. This cookie is strictly necessary for the operation of the Service and does not require consent under the ePrivacy Directive. We do not use tracking cookies or third-party advertising cookies.\n\n" +
      "Subscription and billing data: Plan type, subscription status, billing period, and payment provider identifiers. We do not store credit card numbers.\n\n" +
      "Error reports: When an error occurs, the Service may automatically send error messages, stack traces, screen names, platform type, app version, device type, and OS version.\n\n" +
      "Contact form submissions: Email address, category, message body, and IP address when you submit a support request.",
  },
  {
    title: "3. How We Use Your Information",
    content:
      "We use the information we collect for the following purposes:\n\n" +
      "- Providing and maintaining the Service, including account management\n" +
      "- Processing subscriptions and payments\n" +
      "- Syncing your data across multiple devices\n" +
      "- Improving the Service and fixing bugs\n" +
      "- Detecting and preventing abuse or unauthorized access\n" +
      "- Responding to support requests\n\n" +
      "We do not engage in automated decision-making or profiling as defined in GDPR Article 22.",
  },
  {
    title: "4. Legal Basis for Processing (EU/EEA Users)",
    content:
      "If you are in the EU or EEA, we process your personal data under the following legal bases under the GDPR:\n\n" +
      "Contract performance (Art. 6(1)(b)): Processing necessary to provide the Service you signed up for, including account management, data sync, and subscription handling. Providing your account information is a contractual requirement; if you do not provide it, we cannot provide the Service.\n\n" +
      "Legitimate interests (Art. 6(1)(f)): We rely on legitimate interests for: (a) access log collection to detect and prevent abuse and unauthorized access; (b) error report collection to identify and fix bugs; (c) service improvement based on aggregated, non-identifying usage patterns. We have assessed that these interests are not overridden by your rights, given the limited nature of the data and its use solely for service operations.\n\n" +
      "Consent (Art. 6(1)(a)): Where required, such as for optional features. You may withdraw consent at any time by contacting us.\n\n" +
      "Legal obligation (Art. 6(1)(c)): Processing required to comply with applicable law, such as retaining billing records for tax purposes.",
  },
  {
    title: "5. Information Sharing and Third Parties",
    content:
      "We do not sell your personal information. We do not share your data with third parties except in the following circumstances:\n\n" +
      "- With your consent\n" +
      "- When required by law, regulation, or legal process\n" +
      "- To Google or Apple for authentication purposes (limited to the data necessary for sign-in)\n\n" +
      "The following service providers process data on our behalf as part of operating the Service:\n\n" +
      "- Cloudflare (server, CDN, and storage infrastructure)\n" +
      "- Neon (database hosting)\n" +
      "- Google (Google OAuth authentication)\n" +
      "- Apple (Sign in with Apple authentication)\n" +
      "- Polar (web payment processing)\n" +
      "- RevenueCat (mobile subscription management)\n" +
      "- Apple App Store (mobile subscription billing and payment processing for iOS)\n" +
      "- Google Play Store (mobile subscription billing and payment processing for Android)\n\n" +
      "Each provider processes data in accordance with their own privacy policies. We have not sold or shared personal information with third parties for cross-context behavioral advertising in the preceding 12 months.",
  },
  {
    title: "6. International Data Transfers",
    content:
      "The Service is operated from Japan. Your data may be processed and stored in Japan, the United States, and other countries where our service providers operate.\n\n" +
      "If you are located in the EU/EEA: Japan has been granted an adequacy decision by the European Commission, meaning transfers of personal data from the EU/EEA to Japan are permitted without additional safeguards. For transfers to other countries that do not have an adequacy decision (such as the United States), our service providers use Standard Contractual Clauses (SCCs) approved by the European Commission as the legal basis for data transfers. You may request information about the safeguards in place by contacting us.",
  },
  {
    title: "7. Data Storage and Security",
    content:
      "Your data is stored locally on your device (IndexedDB on web, SQLite on mobile) and on our servers. Data entered or edited while offline is automatically synced to the server when you reconnect.\n\n" +
      "All communication with our servers is encrypted using HTTPS. Passwords are stored using cryptographic hashing and are never stored in plain text. Local storage security depends on the security mechanisms of your browser or operating system.\n\n" +
      "While we take reasonable measures to protect your data, no method of transmission or storage is 100% secure.",
  },
  {
    title: "8. Data Retention and Deletion",
    content:
      "We retain your data for as long as your account is active. After you delete your account from the settings screen, we apply the following retention periods:\n\n" +
      "- Account data and activity data: Deleted within 30 days of account deletion, except as required by law\n" +
      "- Access logs: Retained for 90 days, then automatically deleted\n" +
      "- Error reports: Retained for 90 days, then automatically deleted\n" +
      "- Subscription and billing data: Retained for the period required by applicable tax law (up to 7 years)\n" +
      "- Contact form submissions: Retained for 1 year after resolution\n\n" +
      "Local data can be removed by uninstalling the app or clearing it from the settings screen.",
  },
  {
    title: "9. Your Rights",
    content:
      "Depending on your jurisdiction, you have the following rights regarding your personal data:\n\n" +
      "All users:\n" +
      "- Access, edit, and delete your activity data directly within the Service\n" +
      "- Delete your account from the settings screen\n" +
      "- Contact us with any data-related requests\n\n" +
      "EU/EEA users (under GDPR):\n" +
      "- Right of access: Request a copy of the personal data we hold about you\n" +
      "- Right to rectification: Request correction of inaccurate data\n" +
      "- Right to erasure: Request deletion of your personal data\n" +
      "- Right to restriction: Request that we restrict processing of your data\n" +
      "- Right to data portability: Request your data in a structured, machine-readable format\n" +
      "- Right to object: Object to processing based on legitimate interests\n" +
      "- Right to withdraw consent: Where processing is based on consent, at any time without affecting the lawfulness of prior processing\n" +
      "- Right to lodge a complaint with your local data protection authority\n\n" +
      "California residents (under CCPA/CPRA):\n" +
      "- Right to know: What personal information we collect, the sources, the purposes, and the categories of third parties with whom we share it\n" +
      "- Right to delete: Request deletion of your personal information\n" +
      "- Right to correct: Request correction of inaccurate personal information\n" +
      "- Right to opt out of sale/sharing: We do not sell or share your personal information for cross-context behavioral advertising\n" +
      "- Right to limit use of sensitive personal information: We do not use sensitive personal information for purposes beyond what is necessary to provide the Service\n" +
      "- Right to non-discrimination: We will not discriminate against you for exercising your privacy rights\n\n" +
      "We will respond to verifiable requests within 30 days (or 45 days if an extension is needed). To exercise any of these rights, please contact us using the contact form below.",
  },
  {
    title: "10. Children\u2019s Privacy",
    content:
      "The Service is not intended for children under the age of 16. We do not knowingly collect personal information from children under 16. In compliance with the U.S. Children\u2019s Online Privacy Protection Act (COPPA), we do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13 (or under 16 where applicable), we will take steps to delete that information promptly.",
  },
  {
    title: "11. Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time. When we do, we will post the updated policy and notify you within the Service, specifying the effective date. For material changes, we will provide at least 30 days\u2019 notice before the effective date.",
  },
  {
    title: "12. Contact",
    content: `If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us through the form below.\n\nContact form: ${config.contactUrl}`,
  },
];
