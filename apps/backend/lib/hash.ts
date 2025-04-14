/**
 * 文字列をSHA-256でハッシュ化し、16進数文字列として返します
 * @param text ハッシュ化する文字列
 * @returns ハッシュ化された16進数文字列
 */
export async function hashWithSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
