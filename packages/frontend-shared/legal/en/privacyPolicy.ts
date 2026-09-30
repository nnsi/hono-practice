import type { LegalSection, PrivacyPolicyConfig } from "../privacyPolicy";

export const privacyPolicyTitleEn = "Privacy Policy";

export const privacyPolicyEffectiveDateEn = "Last revised: September 30, 2026";

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
      "Activity data: Activity names, dates, times, quantities, memos, goals, and other content you enter into the Service. The Service is not intended for storing sensitive personal data as defined under GDPR Article 9 (such as health, religious or philosophical beliefs, sexual orientation, or political opinions). Please avoid entering sensitive personal data into the optional AI feature. Entering information alone does not constitute explicit consent where such consent is required by law. You may delete your entries at any time. See Section 6 of the Terms of Service for related restrictions.\n\n" +
      "Access logs: Request timestamps, IP addresses, and user-agent strings, used for service operations and abuse detection.\n\n" +
      "Cookies: We use a single HTTP-only cookie to store your authentication refresh token. This cookie is strictly necessary for the operation of the Service and does not require consent under the ePrivacy Directive. We do not use tracking cookies or third-party advertising cookies.\n\n" +
      "Subscription and billing data: Plan type, subscription status, billing period, and payment provider identifiers. We do not store credit card numbers.\n\n" +
      "Error and authentication diagnostics: For troubleshooting, the Service sends error types, messages, stack traces, screen names, platform type, user identifiers, app version when available, and authentication results, timestamps, durations, and retry counts. Error messages and stack traces may contain information related to the operation that failed.\n\n" +
      "Subscription SDK data: When the mobile subscription SDK is enabled, user identifiers, purchase and restoration information, and app, OS, and SDK information are sent to RevenueCat at login, entitlement checks, purchases, and restoration. This also applies to free-plan users.\n\n" +
      "AI input: When you use the AI activity recording feature, your input text, registered activity and activity-type names and identifiers, units, and date are sent through our server to OpenRouter and the selected model provider for analysis and activity record creation. Ordinary manual recording and synchronization do not send this data to those AI providers. Provider retention and secondary-use terms depend on the provider and settings; we do not make a blanket guarantee of zero retention or no training use.\n\n" +
      "Contact form submissions: Email address, category, message body, and IP address when you submit a support request.",
  },
  {
    title: "3. How We Use Your Information",
    content:
      "We use the information we collect for the following purposes:\n\n" +
      "- Providing and maintaining the Service, including account management\n" +
      "- Processing subscriptions and payments\n" +
      "- Syncing your data across multiple devices\n" +
      "- Analyzing input and creating activity records when you use the AI feature\n" +
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
      "Legitimate interests (Art. 6(1)(f)): We rely on legitimate interests for: (a) access log collection to detect and prevent abuse and unauthorized access; (b) error report collection to identify and fix bugs; (c) service improvement based on aggregated, non-identifying usage patterns. This basis applies only to the extent that these interests are not overridden by your rights and freedoms.\n\n" +
      "Consent (Art. 6(1)(a)): Where required, such as for optional features. You may withdraw consent at any time by contacting us.\n\n" +
      "Legal obligation (Art. 6(1)(c)): Processing required to comply with applicable law, such as retaining billing records for tax purposes.",
  },
  {
    title: "5. Information Sharing and Third Parties",
    content:
      "We do not sell your personal information. We do not share your data with third parties except in the following circumstances:\n\n" +
      "- With your consent\n" +
      "- When required by law, regulation, legal process, or a lawful request from a competent authority\n" +
      "- To prevent fraud, protect the security of the Service, or defend our legal rights\n" +
      "- As part of a business transfer, including a merger, acquisition, reorganization, sale of assets, or bankruptcy (see below)\n\n" +
      "Authentication providers (independent data controllers): When you choose to sign in with Google or Apple, you initiate an authentication process with those providers directly. We receive identity information from them as described in Section 2. Google and Apple process your data as independent data controllers in accordance with their own privacy policies.\n\n" +
      "External service providers: We use the following services to operate the Service:\n\n" +
      "- Cloudflare (server, CDN, and storage infrastructure)\n" +
      "- Neon (database hosting)\n" +
      "- RevenueCat (mobile subscription management)\n" +
      "- OpenRouter, Inc. (United States) and the selected AI model provider (analysis when you use the AI feature; providers and processing countries vary by model and routing)\n\n" +
      "Mobile platform providers (independent data controllers for payment processing): When you purchase a mobile subscription, the Apple App Store (iOS) or Google Play Store (Android) processes your payment and billing data as an independent data controller under its own terms and privacy policy. We receive from them only the subscription status and transaction identifiers necessary to provision and maintain your subscription.\n\n" +
      "Business transfer: If the Operator is involved in a merger, acquisition, sale of all or substantially all of its assets, corporate restructuring, or similar transaction, your personal data may be transferred to the successor entity as part of that transaction. We will notify you within the Service of any such transfer and of any material change to this Privacy Policy that results from it.\n\n" +
      "We have not sold or shared personal information with third parties for cross-context behavioral advertising in the preceding 12 months.",
  },
  {
    title: "6. International Data Transfers",
    content:
      "The Service is operated from Japan. Your data may be processed and stored in Japan, the United States, and other countries where our service providers operate.\n\n" +
      "A provider's headquarters may differ from the location where it processes or stores data. International transfers are subject to applicable law, including any required information and consent or other appropriate safeguards. We do not represent that the same contract or safeguards apply to every provider. Contact us for information about recipients, countries, safeguards, and their verification status.",
  },
  {
    title: "7. Data Storage and Security",
    content:
      "Your data is stored locally on your device (IndexedDB on web, SQLite on mobile) and on our servers. Data entered or edited while offline is automatically synced to the server when you reconnect.\n\n" +
      "All communication with our servers is encrypted using HTTPS. Passwords are stored using cryptographic hashing and are never stored in plain text. Local storage security depends on the security mechanisms of your browser or operating system.\n\n" +
      "While we take reasonable measures to protect your data, no method of transmission or storage is 100% secure.\n\n" +
      "Your backup responsibility: You are responsible for maintaining your own backups of important data. We encourage you to periodically export your activity data using the CSV export feature available in the settings screen. The Operator is not liable for any loss of data resulting from service interruptions, technical failures, account deletion, or other causes, except as provided in these Terms and the Privacy Policy.",
  },
  {
    title: "8. Data Retention and Deletion",
    content:
      "Deleting your account in settings deactivates the server account and prevents login and access to related data. This action does not immediately erase server data. Permanent deletion requires a separate action by the Operator; there is currently no automatic deletion after a fixed number of days.\n\n" +
      "Retention of account and activity data, access logs, error and authentication diagnostics, and support requests is limited to what is necessary for their purposes, support, fraud prevention, disputes, and legal obligations. Data that is no longer needed is deleted or made non-identifying. Records subject to a legal retention obligation are kept for the applicable statutory period.\n\n" +
      `To request permanent deletion or ask about its status or completion time, contact ${config.contactUrl} or ${config.contactEmail}. After identity verification, we will explain the scope, expected handling, and outcome. This does not limit any statutory right to erasure or other data rights. This revision does not extend any deadline under the prior policy for a deletion request received before the revision applies.\n\n` +
      "Local data can be removed through settings, by clearing browser site data, or by uninstalling the app, as applicable. Deleting your account or uninstalling the app does not automatically cancel an App Store or Google Play subscription. Cancel through the relevant store to stop recurring charges.",
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
      "Identity verification: To protect your data, we will verify your identity before fulfilling any access, correction, deletion, or similar request. We may ask you to provide information that matches the information we hold about you (such as confirming you can access the email address or account associated with the request). If we cannot reasonably verify your identity, or if the information provided is insufficient, we may decline to act on the request and will notify you of the reason. Requests are handled free of charge. Any refusal will be subject to applicable law and accompanied by an explanation.\n\n" +
      "Response times:\n" +
      "- EU/EEA (GDPR): We will respond within one month of receiving a request, subject to applicable identity-verification rules. This period may be extended by up to two further months where necessary, taking into account the complexity and number of requests; we will inform you of any extension within one month.\n" +
      "- California (CCPA/CPRA): We will respond within 45 days of receiving a request, subject to applicable identity-verification rules. This period may be extended once by an additional 45 days where reasonably necessary; we will inform you of any extension within the initial 45-day period.\n" +
      "- Other users: We normally respond within 14 days, or within 30 days if the request is complex or requires substantial investigation.\n\n" +
      "To exercise any of these rights, please contact us using the contact form below.",
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
    content: `If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us through the form below.\n\nContact form: ${config.contactUrl}\nEmail: ${config.contactEmail}\nOperator: ${config.administratorName || "Name provided without delay upon request."}\nAddress: Provided without delay upon request.`,
  },
];
