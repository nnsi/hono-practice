import { SignJWT, importPKCS8 } from "jose";

type AppleClientSecretParams = {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKeyBase64: string;
};

/**
 * Apple Sign In の client_secret を生成する。
 * Apple は静的な client_secret ではなく、ES256 で署名した JWT を要求する。
 * 有効期限は最大6ヶ月だが、都度生成で運用する。
 */
export async function generateAppleClientSecret(
  params: AppleClientSecretParams,
): Promise<string> {
  const { teamId, keyId, clientId, privateKeyBase64 } = params;

  const pem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;
  const privateKey = await importPKCS8(pem, "ES256");

  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60) // 6ヶ月
    .sign(privateKey);
}
