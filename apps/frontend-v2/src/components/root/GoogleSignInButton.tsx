import { useEffect, useRef, useCallback } from "react";

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
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
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

    if (buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: buttonRef.current.offsetWidth,
        text: "signin_with",
        locale: "ja",
      });
    }
  }, []);

  useEffect(() => {
    initGoogle();
  }, [initGoogle]);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={buttonRef} />;
}
