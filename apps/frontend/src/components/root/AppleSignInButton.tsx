import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    AppleID: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization?: { id_token?: string };
        }>;
      };
    };
  }
}

const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID;
const APPLE_SCRIPT_URL =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

type AppleSignInButtonProps = {
  onSuccess: (credential: string) => void;
  onError: () => void;
  text?: "signin" | "signup";
};

let appleLoaded = false;
let appleLoadPromise: Promise<void> | null = null;

function loadAppleScript(): Promise<void> {
  if (appleLoaded) return Promise.resolve();
  if (appleLoadPromise) return appleLoadPromise;

  appleLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = APPLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      appleLoaded = true;
      resolve();
    };
    script.onerror = () => {
      appleLoadPromise = null;
      reject(new Error("Failed to load Apple Sign In SDK"));
    };
    document.head.appendChild(script);
  });

  return appleLoadPromise;
}

export function AppleSignInButton({
  onSuccess,
  onError,
  text = "signin",
}: AppleSignInButtonProps) {
  const callbackRef = useRef({ onSuccess, onError });
  callbackRef.current = { onSuccess, onError };
  const initializedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!APPLE_CLIENT_ID) return;

    let active = true;

    loadAppleScript()
      .then(() => {
        if (!active || initializedRef.current) return;
        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: "name email",
          redirectURI: `${window.location.origin}/auth/apple/callback`,
          usePopup: true,
        });
        initializedRef.current = true;
        setReady(true);
      })
      .catch(() => {
        if (active) callbackRef.current.onError();
      });

    return () => {
      active = false;
    };
  }, []);

  const handleClick = async () => {
    if (!ready) return;
    try {
      const data = await window.AppleID.auth.signIn();
      const idToken = data.authorization?.id_token;
      if (idToken) {
        callbackRef.current.onSuccess(idToken);
      } else {
        callbackRef.current.onError();
      }
    } catch {
      callbackRef.current.onError();
    }
  };

  const label = text === "signup" ? "Appleで登録" : "Appleでログイン";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready}
      className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-black text-sm font-medium text-white transition-opacity hover:bg-gray-900 disabled:opacity-50"
    >
      <AppleIcon />
      <span>{label}</span>
    </button>
  );
}

function AppleIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label="Apple"
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
