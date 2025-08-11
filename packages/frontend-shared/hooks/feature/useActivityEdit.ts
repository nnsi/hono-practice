import { useEffect, useRef } from "react";

import type {
  FileAdapter,
  FormAdapterWithFieldArray,
  NotificationAdapter,
} from "@packages/frontend-shared/adapters";
import type {
  GetActivityResponse,
  UpdateActivityRequest,
} from "@packages/types";

export type ActivityEditDependencies = {
  form: FormAdapterWithFieldArray<UpdateActivityRequest>;
  notification: NotificationAdapter;
  file?: FileAdapter;
  api: {
    updateActivity: (params: {
      id: string;
      data: UpdateActivityRequest;
    }) => Promise<void>;
    deleteActivity: (id: string) => Promise<void>;
    uploadActivityIcon: (params: {
      id: string;
      file: File | FormData;
    }) => Promise<void>;
    deleteActivityIcon: (id: string) => Promise<void>;
  };
};

export function createUseActivityEdit(
  dependencies: ActivityEditDependencies,
  activity: GetActivityResponse | null,
  onClose: () => void,
) {
  const { form, notification, file, api } = dependencies;

  // Track previous activity to avoid unnecessary form resets
  const prevActivityIdRef = useRef<string | null>(null);

  // Initialize form with activity data
  useEffect(() => {
    if (activity && activity.id !== prevActivityIdRef.current) {
      prevActivityIdRef.current = activity.id;
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
          color: kind.color ?? "",
        })),
      });
    }
  }, [activity, form.reset]);

  // Field array operations for kinds
  const kindFieldArray = form.useFieldArray?.("kinds");

  // State management
  const isSubmitting = form.formState.isSubmitting;

  // Delete activity handler
  const handleDelete = async () => {
    if (!activity) return;

    try {
      await api.deleteActivity(activity.id);
      notification.toast({
        title: "アクティビティを削除しました",
        variant: "default",
      });
      onClose();
    } catch (error) {
      notification.toast({
        title: "削除に失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Submit handler
  const onSubmit = async (data: UpdateActivityRequest) => {
    if (!activity) return;

    try {
      await api.updateActivity({ id: activity.id, data });
      notification.toast({
        title: "アクティビティを更新しました",
        variant: "default",
      });
      onClose();
    } catch (error) {
      notification.toast({
        title: "更新に失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Kind management handlers
  const handleRemoveKind = (index: number) => {
    kindFieldArray?.remove(index);
  };

  const handleAddKind = () => {
    kindFieldArray?.append({ name: "", color: "" });
  };

  // Icon upload handler
  const uploadIcon = async (
    fileInput: File | { uri: string; type?: string; name?: string },
  ) => {
    if (!activity) return;

    try {
      let uploadData: File | FormData;

      if ("uri" in fileInput && file?.createFormData) {
        // React Native path
        uploadData = file.createFormData(fileInput);
      } else if (fileInput instanceof File) {
        // Web path
        uploadData = fileInput;
      } else {
        throw new Error("Invalid file input");
      }

      await api.uploadActivityIcon({ id: activity.id, file: uploadData });
      notification.toast({
        title: "アイコンをアップロードしました",
        variant: "default",
      });
    } catch (error) {
      notification.toast({
        title: "アップロードに失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Icon delete handler
  const deleteIcon = async () => {
    if (!activity) return;

    try {
      await api.deleteActivityIcon(activity.id);
      notification.toast({
        title: "アイコンを削除しました",
        variant: "default",
      });
    } catch (error) {
      notification.toast({
        title: "削除に失敗しました",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // File picker for mobile
  const pickIcon = async () => {
    if (!file?.pickImage) {
      notification.toast({
        title: "画像選択は利用できません",
        variant: "destructive",
      });
      return null;
    }

    return file.pickImage();
  };

  return {
    form,
    kindFields: kindFieldArray?.fields || [],
    isPending: isSubmitting,
    onSubmit: form.handleSubmit(onSubmit),
    handleDelete,
    handleRemoveKind,
    handleAddKind,
    uploadIcon,
    deleteIcon,
    pickIcon,
  };
}
