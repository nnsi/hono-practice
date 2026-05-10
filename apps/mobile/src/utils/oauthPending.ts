import type { Consents } from "@packages/types/request";

export type OAuthPending = {
  codeVerifier: string;
  redirectUri: string;
  intent: "login" | "link";
  consents?: Consents;
};

let pending: OAuthPending | null = null;

export function setOAuthPending(state: OAuthPending) {
  pending = state;
}

export function getOAuthPending(): OAuthPending | null {
  return pending;
}

export function clearOAuthPending() {
  pending = null;
}
