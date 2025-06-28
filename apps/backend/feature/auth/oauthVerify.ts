// OIDC IDトークン標準クレーム型
export type OIDCPayload = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  // 必要に応じて他のクレームも追加
};

// OAuth/OIDCトークン検証関数の型
export type OAuthVerify = (
  credential: string,
  clientId: string,
) => Promise<OIDCPayload>;
