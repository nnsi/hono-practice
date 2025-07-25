import { useEffect } from "react";

import { useAuth } from "@frontend/hooks/useAuth";
import { getSyncManagerInstance } from "@frontend/services/sync";
import { useMutation } from "@tanstack/react-query";

import { useNetworkStatusContext } from "../../providers/NetworkStatusProvider";

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
  const syncManager = getSyncManagerInstance(user?.id);

  const mutation = useMutation<TData, TError, TVariables>({
    ...options,
    networkMode: "always", // オフライン時でもmutationを実行
    mutationFn: async (variables: TVariables) => {
      if (isOnline) {
        try {
          return await options.onlineAction(variables);
        } catch (error) {
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
              .catch(() => {});
            return options.offlineAction(variables);
          }
          throw error;
        }
      } else {
        if (!options.offlineAction) {
          throw new Error("オフライン時の処理が定義されていません");
        }

        const entityId = options.getEntityId(variables);

        // オフライン時は非同期でキューに登録し、結果を待たずに処理を進める
        syncManager
          .enqueue(
            options.entityType,
            entityId,
            options.operation,
            variables as Record<string, unknown>,
          )
          .then((result) => {
            return result;
          })
          .catch(() => {});

        const result = options.offlineAction(variables);

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
      syncManager.syncBatch().catch(() => {});
    }
  }, [isOnline]);

  return {
    ...mutation,
    syncStatus: syncManager.getSyncStatus(),
  };
}
