import { onlineManager } from "@tanstack/react-query";

/**
 * TanStack QueryのonlineManagerと連携して
 * オンライン/オフライン状態を同期的に設定する
 */
export function setOnlineManagerOnline(online: boolean) {
  onlineManager.setOnline(online);
}
