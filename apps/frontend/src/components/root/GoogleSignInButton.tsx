import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: string;
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";

type GoogleSignInButtonProps = {
  onSuccess: (credential: string) => void;
  onError: () => void;
  text?: "signin_with" | "signup_with";
};

// GIS スクリプトのロード状態管理（複数マウント対策）
let gisLoaded = false;
let gisLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  text = "signin_with",
}: GoogleSignInButtonProps) {
  const gisRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef({ onSuccess, onError });
  callbackRef.current = { onSuccess, onError };

  const initGoogle = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) return;

    await loadGisScript();

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => {
        if (response.credential) {
          callbackRef.current.onSuccess(response.credential);
        } else {
          callbackRef.current.onError();
        }
      },
    });

    if (gisRef.current) {
      window.google.accounts.id.renderButton(gisRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: containerRef.current?.offsetWidth || 320,
        text,
        locale: "ja",
      });
    }
  }, []);

  useEffect(() => {
    initGoogle();
  }, [initGoogle]);

  if (!GOOGLE_CLIENT_ID) return null;

  const label = text === "signup_with" ? "Googleで登録" : "Googleでログイン";

  return (
    <div ref={containerRef} className="relative h-10 w-full cursor-pointer">
      <div className="pointer-events-none flex h-full select-none items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700">
        <GoogleIcon />
        <span>{label}</span>
      </div>
      <div
        ref={gisRef}
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: 0.01 }}
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2087 1.125-.8427 2.0782-1.796 2.7164v2.2582h2.9087c1.7018-1.5668 2.6837-3.8741 2.6837-6.6155Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1791l-2.9087-2.2582c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5827-5.0364-3.7091H.9568v2.3318C2.4377 15.9827 5.4818 18 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.9636 10.7127A5.4092 5.4092 0 0 1 3.6818 9c0-.5959.1023-1.1759.2818-1.7127V4.9555H.9568A8.9954 8.9954 0 0 0 0 9c0 1.4523.3477 2.8277.9568 4.0445l3.0068-2.3318Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5782c1.3214 0 2.5078.4541 3.4405 1.345l2.5813-2.5814C13.4632.8905 11.4259 0 9 0 5.4818 0 2.4377 2.0173.9568 4.9555l3.0068 2.3318C4.6718 5.1609 6.6559 3.5782 9 3.5782Z"
      />
    </svg>
  );
}
