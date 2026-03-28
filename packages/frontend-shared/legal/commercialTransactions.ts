import type { LegalSection } from "./privacyPolicy";

export type CommercialTransactionsConfig = {
  contactEmail: string;
};

export const commercialTransactionsTitle = "特定商取引法に基づく表記";

export const createCommercialTransactionsSections = (
  config: CommercialTransactionsConfig,
): LegalSection[] => [
  {
    title: "販売事業者",
    content: `請求があった場合に遅滞なく開示いたします。\n開示のご請求先: ${config.contactEmail}`,
  },
  {
    title: "所在地",
    content: `請求があった場合に遅滞なく開示いたします。\n開示のご請求先: ${config.contactEmail}`,
  },
  {
    title: "電話番号",
    content: `請求があった場合に遅滞なく開示いたします。\n開示のご請求先: ${config.contactEmail}`,
  },
  {
    title: "メールアドレス",
    content: config.contactEmail,
  },
  {
    title: "販売価格",
    content:
      "サービス内の購入画面に表示される金額をご確認ください。価格は税込み表示です。",
  },
  {
    title: "販売価格以外の必要料金",
    content:
      "本サービスの利用にはインターネット接続が必要です。通信料はお客様のご負担となります。",
  },
  {
    title: "支払方法",
    content: "クレジットカード（Visa、Mastercard、American Express等）",
  },
  {
    title: "支払時期",
    content:
      "初回購入時に即時決済されます。以降、毎月の更新日に自動的に課金されます。",
  },
  {
    title: "サービス提供時期",
    content: "決済完了後、直ちにご利用いただけます。",
  },
  {
    title: "契約期間・自動更新について",
    content:
      "本サブスクリプションは月額の自動更新契約です。契約期間は1か月単位で、解約手続きを行わない限り毎月自動的に更新されます。\n\n" +
      "解約は設定画面からいつでも行えます。次回の課金を避けるには、現在の契約期間の終了日より前に解約手続きを完了してください。解約後も、現在の契約期間の終了日まで引き続きご利用いただけます。",
  },
  {
    title: "返品・キャンセルについて",
    content:
      "本サービスはデジタルコンテンツの提供であり、お客様のご都合による購入後の返品・返金には応じられません。ただし、サービスの重大な不具合や二重課金等、当方の責めに帰すべき事由がある場合はこの限りではありません。\n\n" +
      "サブスクリプションはいつでも解約でき、解約後は現在の契約期間の終了日まで引き続きご利用いただけます。既に決済済みの月額料金について、契約期間の途中で解約された場合でも、その月分の返金には応じられません。",
  },
  {
    title: "動作環境",
    content:
      "Web版: Chrome、Safari、Firefox、Edgeの最新版およびその1つ前のバージョン\nモバイル版: iOS 16以降、Android 10以降",
  },
];
