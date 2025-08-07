import { apiClient } from "@frontend/utils";
import {
  createUseAuthLogin,
  createUseCreateUserApi,
  createUseGoogleAuth,
  createUseLinkGoogleAccount,
} from "@packages/frontend-shared/hooks";

/**
 * 通常のログイン用フック
 */
export function useAuthLogin() {
  return createUseAuthLogin({ apiClient });
}

/**
 * Google認証用フック
 */
export function useGoogleAuth() {
  return createUseGoogleAuth({ apiClient });
}

/**
 * ユーザー登録用フック
 */
export function useCreateUserApi() {
  return createUseCreateUserApi({ apiClient });
}

/**
 * Googleアカウント紐付け用フック
 */
export function useLinkGoogleAccount() {
  return createUseLinkGoogleAccount({ apiClient });
}
