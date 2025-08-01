import { useEffect } from "react";

import {
  useDeleteActivity,
  useDeleteActivityIcon,
  useUpdateActivity,
  useUploadActivityIcon,
} from "@frontend/hooks/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import {
  type UpdateActivityRequest,
  UpdateActivityRequestSchema,
} from "@dtos/request/UpdateActivityRequest";
import type { GetActivityResponse } from "@dtos/response";

export const useActivityEdit = (
  activity: GetActivityResponse | null,
  onClose: () => void,
) => {
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
          })),
        }
      : undefined,
  });

  useEffect(() => {
    if (activity) {
      form.reset({
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
        })),
      });
    }
  }, [activity, form]);

  const {
    fields: kindFields,
    append: kindAppend,
    remove: kindRemove,
  } = useFieldArray({
    control: form.control,
    name: "kinds",
  });

  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const uploadIconMutation = useUploadActivityIcon();
  const deleteIconMutation = useDeleteActivityIcon();

  const handleDelete = async () => {
    if (!activity) return;
    try {
      await deleteActivity.mutateAsync(activity.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete activity:", error);
    }
  };

  const onSubmit = (data: UpdateActivityRequest) => {
    if (!activity) return;
    updateActivity.mutate(
      { id: activity.id, data },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  // 種類を削除するハンドラ
  const handleRemoveKind = (index: number) => {
    kindRemove(index);
  };

  // 種類を追加するハンドラ
  const handleAddKind = () => {
    kindAppend({ name: "" });
  };

  // アイコンアップロード
  const uploadIcon = async (file: File) => {
    if (!activity) return;

    try {
      await uploadIconMutation.mutateAsync({ id: activity.id, file });
    } catch (error) {
      console.error("Failed to upload icon:", error);
    }
  };

  // アイコン削除
  const deleteIcon = async () => {
    if (!activity) return;

    try {
      await deleteIconMutation.mutateAsync(activity.id);
    } catch (error) {
      console.error("Failed to delete icon:", error);
    }
  };

  return {
    form,
    kindFields,
    isPending: updateActivity.isPending,
    onSubmit,
    handleDelete,
    handleRemoveKind,
    handleAddKind,
    uploadIcon,
    deleteIcon,
  };
};
