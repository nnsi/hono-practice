# タイマー機能実装計画

## 概要
Activityが「時間」の場合、画面上でタイマー（ストップウォッチ）を起動して計測した時間をActivityLogとして追加する機能を実装する。

## 背景と目的
- 現在は手動で時間を入力する必要がある
- リアルタイムで計測して記録したいニーズがある（勉強時間、作業時間など）
- 「どのアプリよりも最速で活動量を記録する」という目標に沿って、タイマー開始/停止を最小限の操作で実現する

## 想定ユースケース
- 勉強開始時にタイマーを開始し、終了時に停止して記録
- 作業中に他のアプリで調べ物をして、戻ってきたら継続中のタイマーから再開
- スマホでタイマーを開始して、PCで別の作業をした後、スマホに戻って停止

## 機能要件

### 1. タイマー対象の判定
- ActivityのquantityUnitが時間単位（「時間」「分」「秒」など）の場合にタイマー機能を有効化
- 判定ロジック：quantityUnitに「時」「分」「秒」「hour」「min」「sec」が含まれるかチェック

### 2. タイマー機能
- **開始/停止**: ワンタップでタイマーの開始/停止
- **経過時間表示**: リアルタイムで経過時間を表示（MM:SS形式）
- **リセット**: タイマーをリセットして0に戻す
- **記録**: 停止時に自動的にActivityLogとして保存

### 3. データ保存
- 計測時間を適切な単位に変換してquantityに保存
  - 「時間」単位: 秒→時間に変換（小数点2桁まで）
  - 「分」単位: 秒→分に変換（小数点1桁まで）
  - 「秒」単位: そのまま秒数を保存
- オプション：開始・終了時刻をmemoに記録

## 技術設計

### 1. コンポーネント構成
```
ActivityLogCreateForm.tsx
├── 既存の手動入力フォーム
└── TimerMode（新規追加）
    ├── TimerDisplay: 経過時間表示
    ├── TimerControls: 開始/停止/リセットボタン
    └── useTimer: タイマーロジックのカスタムフック
```

### 2. 状態管理
```typescript
type TimerState = {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number; // ミリ秒
};
```

### 3. useTimerカスタムフック
```typescript
const useTimer = (activityId: string) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // 初回マウント時にlocalStorageから復元
  useEffect(() => {
    const stored = localStorage.getItem(`timer_${activityId}`);
    if (stored) {
      const data: TimerPersistData = JSON.parse(stored);
      if (data.isRunning) {
        const elapsed = Date.now() - data.startTime + (data.pausedTime || 0);
        setElapsedTime(elapsed);
        setStartTime(data.startTime);
        setIsRunning(true);
      }
    }
  }, [activityId]);
  
  // 状態変更時にlocalStorageに保存
  useEffect(() => {
    if (isRunning && startTime) {
      const data: TimerPersistData = {
        activityId,
        startTime,
        isRunning,
      };
      localStorage.setItem(`timer_${activityId}`, JSON.stringify(data));
    } else if (!isRunning && elapsedTime === 0) {
      localStorage.removeItem(`timer_${activityId}`);
    }
  }, [isRunning, startTime, activityId]);
  
  // タイマー開始/停止/リセット/経過時間取得のロジック
  return { isRunning, elapsedTime, start, stop, reset, getFormattedTime };
};
```

### 4. UI/UXデザイン
- 通常モードとタイマーモードを切り替えるシンプルなトグル
- タイマー表示は大きく見やすいフォント
- 開始/停止は同じボタンで状態によって表示を切り替え
- 「極限までシンプル」の原則に従い、必要最小限のUIに留める

## 実装タスク

### Phase 1: 基礎実装
1. [ ] useTimerカスタムフックの実装（localStorage永続化込み）
2. [ ] TimerDisplayコンポーネントの実装
3. [ ] TimerControlsコンポーネントの実装
4. [ ] ActivityLogCreateFormにタイマーモードを統合
5. [ ] quantityUnitによるタイマー機能の有効/無効判定

### Phase 2: 機能強化
6. [ ] 時間単位の自動変換ロジック実装
7. [ ] タイマー停止時の自動保存機能
8. [ ] 開始・終了時刻のmemo記録（オプション）
9. [ ] ブラウザ復帰時のタイマー状態復元
10. [ ] 複数タブでのタイマー競合検知

### Phase 3: UI/UX改善
11. [ ] アニメーション追加（開始/停止時）
12. [ ] バックグラウンドでのタイマー継続対応（Service Worker/Web Workerを使用したバックグラウンド更新）
13. [ ] 誤操作防止（確認ダイアログなど）

### Phase 4: テストとリファクタリング
14. [ ] ユニットテスト作成
15. [ ] E2Eテスト作成
16. [ ] パフォーマンス最適化
17. [ ] コードレビューとリファクタリング

## 技術的考慮事項

### 1. パフォーマンス
- setIntervalではなくrequestAnimationFrameを使用して描画を最適化
- 不要な再レンダリングを防ぐためuseMemoやuseCallbackを適切に使用

### 2. 精度
- Date.now()を使用して正確な経過時間を計測
- ブラウザのタブが非アクティブになっても正確な時間を保持

### 2.1 タイマー状態復元 vs バックグラウンド継続の違い

**タイマー状態復元（Phase 2で実装）**
- ブラウザを完全に閉じて再度開いた時の動作
- localStorageから開始時刻を読み取り、経過時間を計算して表示
- 例：10:00に開始 → 10:30にブラウザ再開 → 30分経過と表示

**バックグラウンドでのタイマー継続（Phase 3で実装）**
- ブラウザタブが非アクティブでも1秒ごとの更新を継続
- Service WorkerやWeb Workerを使用してバックグラウンドで動作
- 通知APIと連携して、一定時間経過を通知することも可能
- 例：タブを切り替えても、バックグラウンドでタイマーが動き続ける

### 3. 永続化（重要）
- **タイマー状態の自動保存**
  - タイマー開始時にlocalStorageに以下を保存：
    ```typescript
    type TimerPersistData = {
      activityId: string;
      startTime: number; // タイムスタンプ
      pausedTime?: number; // 一時停止した場合の経過時間
      isRunning: boolean;
    };
    ```
  - 1秒ごとに状態を更新（バッテリー消費を考慮し、間隔は調整可能）

- **タイマー状態の復元**
  - ページ読み込み時にlocalStorageをチェック
  - 実行中のタイマーがある場合：
    - 経過時間を計算：`Date.now() - startTime`
    - タイマーUIを復元して継続
    - トースト通知で「タイマーを継続中」と表示
  
- **複数タブ対応**
  - 同じActivityのタイマーが他のタブで起動されたら警告
  - storage eventを使用してタブ間で同期

### 4. アクセシビリティ
- スクリーンリーダー対応
- キーボード操作対応（Space: 開始/停止、R: リセット）

## リリース計画
1. まずPhase 1を実装して内部テスト
2. フィードバックを元にPhase 2, 3を実装
3. 十分なテストの後、本番環境にリリース

## 成功指標
- タイマー開始から記録完了まで3タップ以内
- 既存の手動入力機能との切り替えがスムーズ
- バグやクラッシュが発生しない安定性