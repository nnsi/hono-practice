export const getRandomDateWithinDays = (daysBack: number, daysForward = 0) => {
  const now = new Date();
  const startOffset = -daysBack * 24 * 60 * 60 * 1000;
  const endOffset = daysForward * 24 * 60 * 60 * 1000;
  const randomOffset = Math.random() * (endOffset - startOffset) + startOffset;
  return new Date(now.getTime() + randomOffset);
};

export const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getRandomFloat = (min: number, max: number, decimals = 2) => {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
};

export const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

export const formatTime = (date: Date) => {
  return date.toTimeString().split(" ")[0];
};

export const DEV_ACTIVITIES_DATA = [
  {
    name: "ランニング",
    label: "走った距離",
    emoji: "🏃",
    description: "毎日のランニング記録",
    quantityUnit: "km",
    orderIndex: "a",
    kinds: ["朝ラン", "夜ラン", "ジムトレッドミル"],
  },
  {
    name: "読書",
    label: "読んだページ数",
    emoji: "📚",
    description: "読書の進捗管理",
    quantityUnit: "ページ",
    orderIndex: "b",
    kinds: ["技術書", "ビジネス書", "小説"],
  },
  {
    name: "プログラミング",
    label: "コーディング時間",
    emoji: "💻",
    description: "プログラミングの学習時間",
    quantityUnit: "時間",
    orderIndex: "c",
    kinds: ["Frontend", "Backend", "インフラ"],
  },
  {
    name: "筋トレ",
    label: "トレーニング回数",
    emoji: "💪",
    description: "筋力トレーニングの記録",
    quantityUnit: "セット",
    orderIndex: "d",
    kinds: ["腕立て伏せ", "腹筋", "スクワット"],
  },
  {
    name: "水分補給",
    label: "飲んだ量",
    emoji: "💧",
    description: "1日の水分摂取量",
    quantityUnit: "ml",
    orderIndex: "e",
    kinds: [],
  },
];

export const DEV_TASKS_DATA = [
  {
    title: "週次レポートを作成する",
    memo: "今週の進捗をまとめる",
    daysFromNow: () => getRandomInt(-3, 7),
    done: () => Math.random() < 0.3,
  },
  {
    title: "歯医者の予約",
    memo: "定期検診の予約を取る",
    daysFromNow: () => getRandomInt(1, 14),
    done: () => false,
  },
  {
    title: "プロジェクトの企画書を書く",
    memo: "新規プロジェクトの提案資料",
    daysFromNow: () => getRandomInt(3, 10),
    done: () => false,
  },
  {
    title: "誕生日プレゼントを買う",
    memo: "",
    daysFromNow: () => getRandomInt(5, 20),
    done: () => Math.random() < 0.2,
  },
  {
    title: "オンライン勉強会に参加",
    memo: "TypeScriptの新機能について",
    daysFromNow: () => getRandomInt(-7, -1),
    done: () => true,
  },
  {
    title: "家の掃除",
    memo: "週末の大掃除",
    daysFromNow: () => getRandomInt(0, 3),
    done: () => Math.random() < 0.4,
  },
];
