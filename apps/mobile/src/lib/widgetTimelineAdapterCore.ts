export type WidgetTimelineAdapter = {
  reloadWidget(): void;
};

export type ExtensionStorageModule = {
  reloadWidget(name?: string): void;
};

type NativeModuleResolver = (name: string) => ExtensionStorageModule | null;

export function createExtensionStorageAdapter(
  resolveNativeModule: NativeModuleResolver,
): WidgetTimelineAdapter {
  return {
    reloadWidget() {
      resolveNativeModule("ExtensionStorage")?.reloadWidget();
    },
  };
}
