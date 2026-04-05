import type { LegalSection } from "./privacyPolicy";

export type CommercialTransactionsConfig = {
  contactEmail: string;
  /**
   * 販売事業者の氏名。特定商取引法11条1号により個人事業主の氏名は
   * 常時表示が必須であり、「請求による開示」では代替できません
   * （消費者庁「通信販売広告Q&A」Q16）。空文字の場合はフォールバックとして
   * 「請求による開示」文言を表示しますが、これは法令不適合です。
   */
  administratorName: string;
};

export const commercialTransactionsTitle = "特定商取引法に基づく表記";

export const createCommercialTransactionsSections = (
  config: CommercialTransactionsConfig,
): LegalSection[] => [
  {
    title: "販売事業者",
    content: config.administratorName
      ? config.administratorName
      : `請求があった場合に遅滞なく開示いたします。\n開示のご請求先: ${config.contactEmail}`,
  },
  {
    title: "所在地",
    content: `請求があった場合に遅滞なく開示いたします。\n開示のご請求先: ${config.contactEmail}`,
  },
  {
    title: "電話番号",
    content: `請求があった場合、当日中（遅くとも翌営業日中）に電子メールにて開示いたします。\n開示のご請求先: ${config.contactEmail}`,
  },
  {
    title: "メールアドレス",
    content: config.contactEmail,
  },
  {
    title: "販売価格",
    content:
      "サービス内の購入画面に表示される金額をご確認ください。価格は税込み表示です。\n\n" +
      "- Web版: Polar の購入画面に表示される金額\n" +
      "- iOS版: App Store の購入画面に表示される金額\n" +
      "- Android版: Google Play の購入画面に表示される金額",
  },
  {
    title: "販売価格以外の必要料金",
    content:
      "本サービスの利用にはインターネット接続が必要です。通信料はお客様のご負担となります。",
  },
  {
    title: "支払方法",
    content:
      "- Web版: クレジットカード（Polar の決済画面に表示される方法。Visa、Mastercard、American Express 等）\n" +
      "- iOS版: App Store（Apple ID）の支払方法に準じます\n" +
      "- Android版: Google Play の支払方法に準じます",
  },
  {
    title: "支払時期",
    content:
      "初回購入時に即時決済されます。以降、毎月の更新日に自動的に課金されます。App Store / Google Play 経由の場合は各ストアの決済タイミングに従います。",
  },
  {
    title: "サービス提供時期",
    content: "決済完了後、直ちにご利用いただけます。",
  },
  {
    title: "契約期間・自動更新について",
    content:
      "本サブスクリプションは月額の自動更新契約です。契約期間は1か月単位で、解約手続きを行わない限り毎月自動的に更新されます。\n\n" +
      "【解約方法】\n" +
      "- Web版: 本アプリの設定画面 > プラン管理 からいつでも解約できます。\n" +
      "- iOS版: iOS の「設定」 > Apple ID > 「サブスクリプション」 > Actiko から解約してください。\n" +
      "- Android版: Google Play アプリ > メニュー > 「定期購入」 > Actiko から解約してください。\n\n" +
      "次回の課金を避けるには、現在の契約期間の終了日より前に解約手続きを完了してください。解約後も、現在の契約期間の終了日まで引き続きご利用いただけます。",
  },
  {
    title: "返品・キャンセルについて",
    content:
      "本サービスはデジタルコンテンツの提供であり、お客様のご都合による購入後の返品・返金には応じられません。ただし、サービスの重大な不具合や二重課金等、当方の責めに帰すべき事由がある場合はこの限りではありません。\n\n" +
      "サブスクリプションはいつでも解約でき、解約後は現在の契約期間の終了日まで引き続きご利用いただけます。既に決済済みの月額料金について、契約期間の途中で解約された場合でも、その月分の返金には応じられません。\n\n" +
      "【プラットフォーム別の返金】\n" +
      "- Web版: 当方の責めに帰すべき事由による返金は " +
      config.contactEmail +
      " までお問い合わせください。\n" +
      "- iOS版: App Store のサブスクリプション返金ポリシーに従います（Apple の「問題を報告する」ページからリクエスト）。\n" +
      "- Android版: Google Play の返金ポリシーに従います。",
  },
  {
    title: "動作環境",
    content:
      "Web版: Chrome、Safari、Firefox、Edge の最新版及びその1つ前のバージョン\nモバイル版: iOS 16以降、Android 10以降",
  },
];
