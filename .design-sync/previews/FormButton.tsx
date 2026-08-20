import { FormButton } from "actiko-frontend";

// FormButton stretches to its container (the app passes `w-full`); wrap each
// story in a realistic form-width column so the variants read as real buttons.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 260 }}>{children}</div>;
}

export function Primary() {
  return (
    <Frame>
      <FormButton variant="primary" label="記録する" className="w-full" />
    </Frame>
  );
}

export function Secondary() {
  return (
    <Frame>
      <FormButton variant="secondary" label="キャンセル" className="w-full" />
    </Frame>
  );
}

export function Danger() {
  return (
    <Frame>
      <FormButton
        variant="danger"
        label="アカウントを削除"
        className="w-full"
      />
    </Frame>
  );
}

export function DangerConfirm() {
  return (
    <Frame>
      <FormButton
        variant="dangerConfirm"
        label="本当に削除する"
        className="w-full"
      />
    </Frame>
  );
}

export function Disabled() {
  return (
    <Frame>
      <FormButton
        variant="primary"
        label="保存中…"
        className="w-full"
        disabled
      />
    </Frame>
  );
}
