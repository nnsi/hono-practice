import { GoalCardActions } from "actiko-frontend";

// ゴールカード右肩のアクションボタン群。現役ゴールは記録(+)/編集、過去ゴールは
// 無効化/削除(2段階確認)に切り替わる。isPast / showDeleteConfirm で出し分ける。
// 単体だと小さいので、実際の配置に近いヘッダー行のコンテナに載せて見せる。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 320 }}
      className="bg-white rounded-xl border border-gray-200 shadow-soft p-3"
    >
      <div className="flex items-center justify-end gap-1.5">{children}</div>
    </div>
  );
}

const noop = () => {};

export function ActiveGoal() {
  return (
    <Frame>
      <GoalCardActions
        isPast={false}
        goalIsActive={true}
        showDeleteConfirm={false}
        deleting={false}
        onRecordOpen={noop}
        onEditStart={noop}
        onDeactivate={noop}
        onDeleteConfirm={noop}
        onDeleteCancel={noop}
        onHandleDelete={noop}
      />
    </Frame>
  );
}

export function PastGoalActive() {
  return (
    <Frame>
      <GoalCardActions
        isPast={true}
        goalIsActive={true}
        showDeleteConfirm={false}
        deleting={false}
        onRecordOpen={noop}
        onEditStart={noop}
        onDeactivate={noop}
        onDeleteConfirm={noop}
        onDeleteCancel={noop}
        onHandleDelete={noop}
      />
    </Frame>
  );
}

export function PastGoalDeleteConfirm() {
  return (
    <Frame>
      <GoalCardActions
        isPast={true}
        goalIsActive={false}
        showDeleteConfirm={true}
        deleting={false}
        onRecordOpen={noop}
        onEditStart={noop}
        onDeactivate={noop}
        onDeleteConfirm={noop}
        onDeleteCancel={noop}
        onHandleDelete={noop}
      />
    </Frame>
  );
}
