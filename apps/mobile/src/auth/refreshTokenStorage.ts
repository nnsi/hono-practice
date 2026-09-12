import { refreshOperationIdSchema } from "@packages/types/authRefresh";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { z } from "zod";

export const REFRESH_TOKEN_KEY = "actiko-refresh-token";
export const REFRESH_SESSION_KEY = "actiko-refresh-session-v2";

const refreshSessionSchema = z
  .object({
    version: z.literal(2),
    refreshToken: z.string().min(1).nullable(),
    pendingOperationId: refreshOperationIdSchema.nullable(),
  })
  .refine(
    (value) => value.refreshToken !== null || value.pendingOperationId === null,
  );

export type StoredRefreshSession = z.infer<typeof refreshSessionSchema>;

const isWeb = Platform.OS === "web";

async function read(key: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getStoredRefreshSession(): Promise<StoredRefreshSession> {
  const raw = await read(REFRESH_SESSION_KEY);
  // A tombstone or corrupt v2 record must never fall back to a stale v1 token.
  if (raw !== null) return refreshSessionSchema.parse(JSON.parse(raw));
  // The next write migrates this value. Refresh always persists its operation
  // before sending HTTP, so it cannot consume a legacy token without migrating.
  return {
    version: 2,
    refreshToken: (await read(REFRESH_TOKEN_KEY)) || null,
    pendingOperationId: null,
  };
}

export async function setStoredRefreshSession(
  session: StoredRefreshSession,
): Promise<void> {
  const safeSession = refreshSessionSchema.parse(session);
  await write(REFRESH_SESSION_KEY, JSON.stringify(safeSession));
  try {
    // Older OTA bundles still read the plain token. The v2 record remains the
    // authority if this compatibility mirror fails or the process stops here.
    if (safeSession.refreshToken !== null) {
      await write(REFRESH_TOKEN_KEY, safeSession.refreshToken);
    } else if (isWeb) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch {
    // A mirror failure must not undo a committed credential or tombstone.
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return (await getStoredRefreshSession()).refreshToken;
}

export async function setStoredRefreshToken(token: string): Promise<void> {
  await setStoredRefreshSession({
    version: 2,
    refreshToken: token,
    pendingOperationId: null,
  });
}

export async function clearStoredRefreshToken(): Promise<void> {
  // Keep this tombstone even after the v1 mirror is deleted. Removing v2 could
  // revive v1 after an interrupted or failed compatibility-key deletion.
  await setStoredRefreshSession({
    version: 2,
    refreshToken: null,
    pendingOperationId: null,
  });
}
