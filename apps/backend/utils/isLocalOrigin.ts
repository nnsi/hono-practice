const LOCAL_ORIGIN_PATTERN =
  /^https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|192\.168\.\d+\.\d+(:\d+)?|10\.\d+\.\d+\.\d+(:\d+)?|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+(:\d+)?)$/;

export function isLocalOrigin(origin: string): boolean {
  return LOCAL_ORIGIN_PATTERN.test(origin);
}
