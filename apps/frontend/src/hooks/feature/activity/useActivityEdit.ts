import {
  type UpdateActivityRequest,
  UpdateActivityRequestSchema,
} from "@dtos/request/UpdateActivityRequest";
import type { GetActivityResponse } from "@dtos/response";
import { useToast } from "@frontend/components/ui";
import {
  useDeleteActivity,
  useDeleteActivityIcon,
  useUpdateActivity,
  useUploadActivityIcon,
} from "@frontend/hooks/api";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createWebFormAdapter,
  createWebNotificationAdapter,
} from "@packages/frontend-shared/adapters";
import { createUseActivityEdit } from "@packages/frontend-shared/hooks/feature";
import { useFieldArray, useForm } from "react-hook-form";

// 新しい共通化されたフックを使用する実装
export const useActivityEdit = (
  activity: GetActivityResponse | null,
  onClose: () => void,
) => {
  // React Hook Form setup
  const form = useForm<UpdateActivityRequest>({
    resolver: zodResolver(UpdateActivityRequestSchema),
    defaultValues: activity
      ? {
          activity: {
            name: activity.name,
            description: activity.description ?? "",
            quantityUnit: activity.quantityUnit,
            emoji: activity.emoji ?? "",
            showCombinedStats: activity.showCombinedStats ?? false,
          },
          kinds: activity.kinds.map((kind) => ({
            id: kind.id,
            name: kind.name,
            color: kind.color ?? "",
          })),
        }
      : undefined,
  });

  // Toast setup
  const { toast } = useToast();

  // API mutations
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const uploadIconMutation = useUploadActivityIcon();
  const deleteIconMutation = useDeleteActivityIcon();

  // Create adapters and dependencies
  const dependencies = {
    form: createWebFormAdapter<UpdateActivityRequest>(
      form as never,
      useFieldArray,
    ),
    notification: createWebNotificationAdapter(),
    api: {
      updateActivity: async (params: {
        id: string;
        data: UpdateActivityRequest;
      }) => {
        await updateActivity.mutateAsync(params);
      },
      deleteActivity: async (id: string) => {
        await deleteActivity.mutateAsync(id);
      },
      uploadActivityIcon: async (params: {
        id: string;
        file: File | FormData;
      }) => {
        await uploadIconMutation.mutateAsync({
          ...params,
          file: params.file as File,
        });
      },
      deleteActivityIcon: async (id: string) => {
        await deleteIconMutation.mutateAsync(id);
      },
    },
  };

  // Set toast callback for Web notification adapter
  if ("setToastCallback" in dependencies.notification) {
    dependencies.notification.setToastCallback(toast);
  }

  // Use the common hook
  const commonHook = createUseActivityEdit(dependencies, activity, onClose);

  // Return the common hook result with the original form instance for compatibility
  return {
    ...commonHook,
    // Return the original react-hook-form instance for UI components
    form,
  };
};
