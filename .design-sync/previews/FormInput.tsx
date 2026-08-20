import { FormInput } from "actiko-frontend";

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 260 }}>{children}</div>;
}

export function Placeholder() {
  return (
    <Frame>
      <FormInput placeholder="アクティビティ名" />
    </Frame>
  );
}

export function WithValue() {
  return (
    <Frame>
      <FormInput defaultValue="ランニング" />
    </Frame>
  );
}

export function Disabled() {
  return (
    <Frame>
      <FormInput defaultValue="編集できません" disabled />
    </Frame>
  );
}
