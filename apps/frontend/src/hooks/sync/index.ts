import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@frontend/hooks/useAuth";
import { getSyncManagerInstance } from "@frontend/services/sync";
import { apiClient } from "@frontend/utils/apiClient";
import {
  createUseActivityLogSync,
  createUseCreateActivityLog,
  createUseDeleteActivityLog,
  createUseSyncStatus,
  createUseSyncedMutation,
  createUseUpdateActivityLog,
} from "@packages/frontend-shared/sync/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

import { useNetworkStatusContext } from "../../providers/NetworkStatusProvider";

import type {
  SyncedMutationOptions,
  UseActivityLogSyncDependencies,
  UseSyncStatusDependencies,
  UseSyncedActivityLogDependencies,
  UseSyncedMutationDependencies,
} from "@packages/frontend-shared/sync/hooks";

// Re-export types
export type { SyncedMutationOptions } from "@packages/frontend-shared/sync/hooks";

// Create web-specific dependencies for useSyncStatus
const syncStatusDependencies: UseSyncStatusDependencies = {
  user: undefined, // Will be provided by the hook
  getSyncManagerInstance,
};

export function useSyncStatus() {
  const { user } = useAuth();
  return createUseSyncStatus({ ...syncStatusDependencies, user });
}

// Create web-specific dependencies for useSyncedMutation
function createSyncedMutationDependencies(): UseSyncedMutationDependencies {
  const { isOnline } = useNetworkStatusContext();
  const { user } = useAuth();

  return {
    isOnline,
    user,
    getSyncManagerInstance,
    useMutation,
    useEffect,
  };
}

export function useSyncedMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
>(options: SyncedMutationOptions<TData, TError, TVariables>) {
  const dependencies = createSyncedMutationDependencies();
  return createUseSyncedMutation(dependencies, options);
}

// Create web-specific dependencies for activity log hooks
const activityLogDependencies: UseSyncedActivityLogDependencies = {
  apiClient,
  useQueryClient,
  uuidv4,
  isOnline: false, // Will be provided by the hook
  createUseSyncedMutation: (options) => {
    const dependencies = createSyncedMutationDependencies();
    return createUseSyncedMutation(dependencies, options);
  },
  storage: {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  },
  eventBus: {
    emit: (event: string, data?: unknown) => {
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    },
  },
};

export function useCreateActivityLog() {
  const { isOnline } = useNetworkStatusContext();
  return createUseCreateActivityLog({ ...activityLogDependencies, isOnline });
}

export function useUpdateActivityLog() {
  const { isOnline } = useNetworkStatusContext();
  return createUseUpdateActivityLog({ ...activityLogDependencies, isOnline });
}

export function useDeleteActivityLog() {
  const { isOnline } = useNetworkStatusContext();
  return createUseDeleteActivityLog({ ...activityLogDependencies, isOnline });
}

// Create web-specific dependencies for useActivityLogSync
const activityLogSyncDependencies: UseActivityLogSyncDependencies = {
  useEffect,
  useMemo: <T>(factory: () => T, deps?: any[]) => useMemo(factory, deps!),
  useState,
  useQueryClient,
  dayjs,
  storage: {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  },
  eventBus: {
    on: (event: string, handler: (data?: unknown) => void) => {
      const listener = (e: Event) => {
        if (e instanceof CustomEvent) {
          handler(e.detail);
        }
      };
      window.addEventListener(event, listener);
      return () => window.removeEventListener(event, listener);
    },
  },
};

export const useActivityLogSync = createUseActivityLogSync(
  activityLogSyncDependencies,
);

// Export task hooks from existing files
export * from "./useSyncedTask";
