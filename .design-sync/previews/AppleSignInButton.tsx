import { AppleSignInButton } from "actiko-frontend";

// Full-width black Apple button; wrap in a form-width column.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 320 }}>{children}</div>;
}

export function SignIn() {
  return (
    <Frame>
      <AppleSignInButton onSuccess={() => {}} onError={() => {}} />
    </Frame>
  );
}

export function SignUp() {
  return (
    <Frame>
      <AppleSignInButton
        onSuccess={() => {}}
        onError={() => {}}
        text="signup"
      />
    </Frame>
  );
}
