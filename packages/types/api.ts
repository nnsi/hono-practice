// biome-ignore lint/style/noRestrictedImports: AppTypeはHonoのルート定義から推論される型で、backendにしか存在しない。この1箇所で再exportし、frontend/packagesはここ経由で参照する。
export type { AppType } from "@backend/app";
