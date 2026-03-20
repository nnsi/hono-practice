type OAuthPending = {
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
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
