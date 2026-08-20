import { FormTextarea } from "actiko-frontend";

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 260 }}>{children}</div>;
}

export function Placeholder() {
  return (
    <Frame>
      <FormTextarea placeholder="メモを入力..." rows={3} />
    </Frame>
  );
}

export function WithValue() {
  return (
    <Frame>
      <FormTextarea defaultValue={"朝のジョギング\n体調は良好"} rows={3} />
    </Frame>
  );
}
