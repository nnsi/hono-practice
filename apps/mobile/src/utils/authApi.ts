import {
  type GetUserResponse,
  GetUserResponseSchema,
} from "@packages/types/response";

import { customFetch, getApiUrl } from "./apiClient";

const API_URL = getApiUrl();

export async function apiGetMe(): Promise<GetUserResponse> {
  const res = await customFetch(`${API_URL}/user/me`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return GetUserResponseSchema.parse(await res.json());
}

export async function apiAppleLink(credential: string) {
  const res = await customFetch(`${API_URL}/auth/apple/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    if (res.status === 409)
      throw new Error("このAppleアカウントは別のユーザーに連携済みです");
    throw new Error("Apple連携に失敗しました");
  }
}

export async function apiGoogleLink(credential: string) {
  const res = await customFetch(`${API_URL}/auth/google/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    if (res.status === 409)
      throw new Error("このGoogleアカウントは別のユーザーに連携済みです");
    throw new Error("Google連携に失敗しました");
  }
}
