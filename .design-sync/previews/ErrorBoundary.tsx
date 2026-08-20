import { ErrorBoundary } from "actiko-frontend";

// ErrorBoundary is a class boundary that catches render errors in its subtree.
// In the normal (no-error) path it transparently renders its children, so the
// "Default" story shows ordinary content passing through. The "Fallback" story
// renders a child that throws on mount, exercising the full-screen error UI
// (dark background, リトライ button). reportErrorOptions is required.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 420 }}>{children}</div>;
}

const reportErrorOptions = {
  apiUrl: "https://example.com",
  platform: "web",
} as const;

function Boom(): React.ReactNode {
  throw new Error("preview render error");
}

export function Default() {
  return (
    <Frame>
      <ErrorBoundary reportErrorOptions={reportErrorOptions}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4 text-sm text-gray-700">
          活動を記録しましょう。
        </div>
      </ErrorBoundary>
    </Frame>
  );
}

export function Fallback() {
  return (
    <Frame>
      <ErrorBoundary reportErrorOptions={reportErrorOptions}>
        <Boom />
      </ErrorBoundary>
    </Frame>
  );
}
