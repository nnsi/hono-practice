import { apiClient } from "@frontend/utils";
import { useMutation } from "@tanstack/react-query";

import type { LoginRequest } from "@dtos/request/LoginRequest";

/**
 * 通常のログイン用フック
 */
export function useAuthLogin() {
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await apiClient.auth.login.$post({
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to login");
      }
      return res.json();
    },
  });
}

/**
 * Google認証用フック
 */
export function useGoogleAuth() {
  return useMutation({
    mutationFn: async (credential: string) => {
      const res = await apiClient.auth.google.$post({
        json: { credential },
      });
      if (!res.ok) {
        throw new Error("Failed to authenticate with Google");
      }
      return res.json();
    },
  });
}

/**
 * ユーザー登録用フック
 */
export function useCreateUserApi() {
  return useMutation({
    mutationFn: async (data: {
      name?: string;
      loginId: string;
      password: string;
    }) => {
      const res = await apiClient.user.$post({
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to create user");
      }
      return res.json();
    },
  });
}

/**
 * Googleアカウント紐付け用フック
 */
export function useLinkGoogleAccount() {
  return useMutation({
    mutationFn: async (credential: string) => {
      const res = await apiClient.auth.google.link.$post({
        json: { credential },
      });
      if (!res.ok) {
        throw new Error("Failed to link Google account");
      }
      return res.json();
    },
  });
}
