import { useCallback, useEffect, useRef } from "react";

type Props = {
  auth: {
    googleLogin: (credential: string) => Promise<void>;
    devLogin: () => Promise<void>;
    error: string | null;
  };
};

const isDev = import.meta.env.DEV;

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export function LoginPage({ auth }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        await auth.googleLogin(response.credential);
      } catch {
        // error is set in auth hook
      }
    },
    [auth],
  );

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = (window as unknown as { google: GoogleIdentity }).google;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      if (buttonRef.current) {
        google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: 300,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [handleCredentialResponse]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lifted">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Actiko Admin
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          管理者アカウントでログインしてください
        </p>

        <div className="flex justify-center">
          <div ref={buttonRef} />
        </div>

        {isDev && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => {
                auth.devLogin().catch(() => {});
              }}
              className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              開発ログイン（Dev Bypass）
            </button>
          </div>
        )}

        {auth.error && (
          <p className="mt-4 text-center text-sm text-red-600">{auth.error}</p>
        )}
      </div>
    </div>
  );
}

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (
        el: HTMLElement,
        options: { theme: string; size: string; width: number },
      ) => void;
    };
  };
};
