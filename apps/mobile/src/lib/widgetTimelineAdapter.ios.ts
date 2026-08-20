import { requireOptionalNativeModule } from "expo";

import {
  type ExtensionStorageModule,
  createExtensionStorageAdapter,
} from "./widgetTimelineAdapterCore";

export const extensionStorageAdapter = createExtensionStorageAdapter((name) =>
  requireOptionalNativeModule<ExtensionStorageModule>(name),
);
