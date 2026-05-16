const LOCAL_ORIGIN_PATTERN =
  /^https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|192\.168\.\d+\.\d+(:\d+)?|10\.\d+\.\d+\.\d+(:\d+)?|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+(:\d+)?)$/;

// Host ヘッダ用。Origin と違ってスキームを持たない (例: "192.168.1.10:8787")。
// LAN 配信時の React Native 実機からの request は Origin を持たないことが多く、
// Host のみで判定する必要があるため別パターンを用意する。
const LOCAL_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)(:\d+)?$/;

export function isLocalOrigin(origin: string): boolean {
  return LOCAL_ORIGIN_PATTERN.test(origin);
}

export function isLocalHost(host: string): boolean {
  return LOCAL_HOST_PATTERN.test(host);
}
