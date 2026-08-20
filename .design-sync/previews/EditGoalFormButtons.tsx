import { EditGoalFormButtons } from "actiko-frontend";

// ゴール編集フォーム下部のボタン行。削除・無効化はそれぞれ2段階のインライン確認に切り替わる。
// 確認状態は showXxxConfirm prop で制御するので、各ストーリーで静的に表現できる。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 320 }}
      className="bg-white rounded-xl border border-gray-200 shadow-soft p-4"
    >
      {children}
    </div>
  );
}

const noop = () => {};
const noopBool = (_: boolean) => {};

export function Default() {
  return (
    <Frame>
      <EditGoalFormButtons
        saving={false}
        showDeactivateConfirm={false}
        setShowDeactivateConfirm={noopBool}
        showDeleteConfirm={false}
        setShowDeleteConfirm={noopBool}
        onDeactivate={noop}
        onDelete={noop}
      />
    </Frame>
  );
}

export function DeleteConfirm() {
  return (
    <Frame>
      <EditGoalFormButtons
        saving={false}
        showDeactivateConfirm={false}
        setShowDeactivateConfirm={noopBool}
        showDeleteConfirm={true}
        setShowDeleteConfirm={noopBool}
        onDeactivate={noop}
        onDelete={noop}
      />
    </Frame>
  );
}

export function DeactivateConfirm() {
  return (
    <Frame>
      <EditGoalFormButtons
        saving={false}
        showDeactivateConfirm={true}
        setShowDeactivateConfirm={noopBool}
        showDeleteConfirm={false}
        setShowDeleteConfirm={noopBool}
        onDeactivate={noop}
        onDelete={noop}
      />
    </Frame>
  );
}

export function Saving() {
  return (
    <Frame>
      <EditGoalFormButtons
        saving={true}
        showDeactivateConfirm={false}
        setShowDeactivateConfirm={noopBool}
        showDeleteConfirm={false}
        setShowDeleteConfirm={noopBool}
        onDeactivate={noop}
        onDelete={noop}
      />
    </Frame>
  );
}
