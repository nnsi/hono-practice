import {
  type ErrorReport,
  reportError as reportErrorShared,
} from "@packages/frontend-shared";
import { Platform } from "react-native";

import { getApiUrl } from "./apiClient";

const API_URL = getApiUrl();

export function reportError(report: ErrorReport): void {
  reportErrorShared(report, {
    apiUrl: API_URL,
    platform: Platform.OS as "ios" | "android" | "web",
  });
}
