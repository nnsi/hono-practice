import { useCallback, useRef, useState } from "react";

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
          authorization: { id_token: string };
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
}: AppleSignInButtonProps) {
  const callbackRef = useRef({ onSuccess, onError });
  callbackRef.current = { onSuccess, onError };
  const [isLoading, setIsLoading] = useState(false);
  const initializedRef = useRef(false);

  const handleClick = useCallback(async () => {
    if (!APPLE_CLIENT_ID || isLoading) return;
    setIsLoading(true);

    try {
      await loadAppleScript();

      if (!initializedRef.current) {
        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: "name email",
          redirectURI: `${window.location.origin}/apple-callback`,
          usePopup: true,
        });
        initializedRef.current = true;
      }

      const response = await window.AppleID.auth.signIn();
      const idToken = response.authorization.id_token;
      if (idToken) {
        callbackRef.current.onSuccess(idToken);
      } else {
        callbackRef.current.onError();
      }
    } catch {
      callbackRef.current.onError();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  if (!APPLE_CLIENT_ID) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full h-[40px] flex items-center justify-center gap-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 814 1000"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Apple"
      >
        <title>Apple</title>
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.8-155.5-127.4c-58.3-81.7-105.6-209.1-105.6-329.5C-1.1 246.7 82.5 127.5 204.2 127.5c65.2 0 119.6 42.8 160.4 42.8 39.5 0 101.1-45.4 176.3-45.4 28.5 0 130.9 2.6 198.3 99.2l48.9 116.8zM554.1 0c8.4 59 -17.1 118-50.3 160.4-34.5 42.8-91 75.2-145.7 75.2-5.2-4.5-6.5-59 27.2-115.5 33.2-55.7 92.3-96 168.8-120.1z" />
      </svg>
      {isLoading ? "サインイン中..." : "Appleでサインイン"}
    </button>
  );
}
