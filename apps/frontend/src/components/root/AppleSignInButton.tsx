import { useEffect, useRef } from "react";

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
      };
    };
  }

  interface DocumentEventMap {
    AppleIDSignInOnSuccess: CustomEvent<{
      authorization?: { id_token?: string };
    }>;
    AppleIDSignInOnFailure: CustomEvent<unknown>;
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
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!APPLE_CLIENT_ID) return;

    let active = true;

    const handleSuccess = (
      event: DocumentEventMap["AppleIDSignInOnSuccess"],
    ) => {
      const idToken = event.detail?.authorization?.id_token;
      if (idToken) {
        callbackRef.current.onSuccess(idToken);
        return;
      }
      callbackRef.current.onError();
    };

    const handleFailure = () => {
      callbackRef.current.onError();
    };

    document.addEventListener("AppleIDSignInOnSuccess", handleSuccess);
    document.addEventListener("AppleIDSignInOnFailure", handleFailure);

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
      })
      .catch(() => {
        if (active) {
          callbackRef.current.onError();
        }
      });

    return () => {
      active = false;
      document.removeEventListener("AppleIDSignInOnSuccess", handleSuccess);
      document.removeEventListener("AppleIDSignInOnFailure", handleFailure);
    };
  }, []);

  if (!APPLE_CLIENT_ID) return null;

  return (
    <div className="w-full overflow-hidden rounded-md">
      <div
        id="appleid-signin"
        data-color="black"
        data-border="false"
        data-type="sign in"
        data-width="320"
        data-height="40"
        className="min-h-[40px] w-full"
      />
    </div>
  );
}
