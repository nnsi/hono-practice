import { useEffect } from "react";

import { useAuth } from "@frontend/hooks/useAuth";
import { SyncManager } from "@frontend/services/sync";
import { useMutation } from "@tanstack/react-query";

import { useNetworkStatusContext } from "../providers/NetworkStatusProvider";

import type { EntityType, SyncOperation } from "@frontend/services/sync";
import type { UseMutationOptions } from "@tanstack/react-query";

export type SyncedMutationOptions<TData, TError, TVariables> = Omit<
  UseMutationOptions<TData, TError, TVariables>,
  "mutationFn"
> & {
  entityType: EntityType;
  getEntityId: (variables: TVariables) => string;
  operation: SyncOperation;
  onlineAction: (variables: TVariables) => Promise<TData>;
  offlineAction?: (variables: TVariables) => TData;
  optimisticUpdate?: (variables: TVariables) => void;
};

export function useSyncedMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
>(options: SyncedMutationOptions<TData, TError, TVariables>) {
  const { isOnline } = useNetworkStatusContext();
  const { user } = useAuth();
  const syncManager = SyncManager.getInstance(user?.id);

  const mutation = useMutation<TData, TError, TVariables>({
    ...options,
    networkMode: "always", // オフライン時でもmutationを実行
    mutationFn: async (variables: TVariables) => {
      console.log("[useSyncedMutation] mutationFn called, isOnline:", isOnline);
      if (isOnline) {
        try {
          console.log("[useSyncedMutation] Calling onlineAction");
          return await options.onlineAction(variables);
        } catch (error) {
          console.log("[useSyncedMutation] onlineAction failed:", error);
          if (options.offlineAction) {
            const entityId = options.getEntityId(variables);
            // オフラインキューへの登録は非同期で行い、失敗してもUIがブロックされないようにする
            syncManager
              .enqueue(
                options.entityType,
                entityId,
                options.operation,
                variables as Record<string, unknown>,
              )
              .catch((enqueueError) => {
                console.error(
                  "[useSyncedMutation] enqueue 失敗 (online fallback):",
                  enqueueError,
                );
              });
            return options.offlineAction(variables);
          }
          throw error;
        }
      } else {
        console.log("[useSyncedMutation] Offline mode");
        if (!options.offlineAction) {
          throw new Error("オフライン時の処理が定義されていません");
        }

        const entityId = options.getEntityId(variables);
        console.log(
          "[useSyncedMutation] Enqueueing offline action, entityId:",
          entityId,
        );

        // オフライン時は非同期でキューに登録し、結果を待たずに処理を進める
        syncManager
          .enqueue(
            options.entityType,
            entityId,
            options.operation,
            variables as Record<string, unknown>,
          )
          .then((result) => {
            console.log("[useSyncedMutation] Enqueue successful:", result);
            return result;
          })
          .catch((enqueueError) => {
            console.error(
              "[useSyncedMutation] enqueue 失敗 (offline):",
              enqueueError,
            );
          });

        console.log("[useSyncedMutation] Calling offlineAction");
        const result = options.offlineAction(variables);
        console.log("[useSyncedMutation] offlineAction result:", result);

        // enqueueの完了を待たずに結果を返す
        return result;
      }
    },
    onMutate: async (variables: TVariables) => {
      if (options.optimisticUpdate) {
        options.optimisticUpdate(variables);
      }
      if (options.onMutate) {
        return await options.onMutate(variables);
      }
    },
    onSuccess: (data, variables, context) => {
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
  });

  useEffect(() => {
    if (isOnline && syncManager.getSyncStatus().pendingCount > 0) {
      console.log("[useSyncedMutation] Online detected, triggering sync...");
      syncManager.syncBatch().catch((error) => {
        console.error("[useSyncedMutation] Sync failed:", error);
      });
    }
  }, [isOnline]);

  return {
    ...mutation,
    syncStatus: syncManager.getSyncStatus(),
  };
}
