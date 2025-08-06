import { createWebStorageAdapter } from "@packages/frontend-shared/adapters/web";
import { createUseAppSettings } from "@packages/frontend-shared/hooks/feature";

// Webアダプターのインスタンスを作成
const storage = createWebStorageAdapter();

// 共通フックをインスタンス化
const useAppSettingsBase = createUseAppSettings({ storage });

export const useAppSettings = () => {
  return useAppSettingsBase();
};
