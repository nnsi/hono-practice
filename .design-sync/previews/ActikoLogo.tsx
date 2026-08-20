import { ActikoLogo } from "actiko-frontend";

// ブランドのレターマーク（SVG単体）。className で幅を与えてサイズを決める。
// 背景色違いで「白背景／濃色背景」両方での見え方を確認する。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 320 }}>{children}</div>;
}

export function Default() {
  return (
    <Frame>
      <div className="flex items-center justify-center bg-white rounded-2xl border border-gray-200 shadow-soft p-8">
        <ActikoLogo className="w-48" />
      </div>
    </Frame>
  );
}

export function Small() {
  return (
    <Frame>
      <div className="flex items-center justify-center bg-white rounded-2xl border border-gray-200 shadow-soft p-6">
        <ActikoLogo className="w-24" />
      </div>
    </Frame>
  );
}

export function OnDark() {
  return (
    <Frame>
      <div className="flex items-center justify-center bg-gray-900 rounded-2xl p-8">
        <ActikoLogo className="w-48" />
      </div>
    </Frame>
  );
}
