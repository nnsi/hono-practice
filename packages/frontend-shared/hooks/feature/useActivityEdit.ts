import { useEffect, useRef, useState } from "react";

import type {
  FileAdapter,
  FormAdapterWithFieldArray,
  NotificationAdapter,
} from "@packages/frontend-shared/adapters";
import type {
  GetActivityResponse,
  UpdateActivityRequest,
} from "@packages/types";

export type IconValue = {
  type: "emoji" | "upload" | "generate";
  emoji?: string;
  file?: File;
  preview?: string;
};

// Grouped return types for better organization
export type ActivityEditFormProps = {
  form: FormAdapterWithFieldArray<UpdateActivityRequest>;
  kindFields: { id?: string; name: string; color?: string }[];
  isPending: boolean;
};

export type ActivityEditIconProps = {
  value: IconValue;
  onChange: (value: IconValue) => Promise<void>;
  pick: () => Promise<{ uri: string; type?: string; name?: string } | null>;
};

export type ActivityEditActions = {
  onSubmit: () => void;
  onDelete: () => Promise<void>;
  onAddKind: () => void;
  onRemoveKind: (index: number) => void;
};

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

  // Icon state management
  const [iconFile, setIconFile] = useState<File | undefined>();
  const [iconPreview, setIconPreview] = useState<string | undefined>();

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

  // Current icon value (derived state)
  const formValues = form.getValues();
  const iconValue: IconValue = {
    type: activity?.iconType ?? "emoji",
    emoji: formValues.activity?.emoji ?? "",
    file: iconFile,
    preview: iconPreview || activity?.iconUrl || undefined,
  };

  // Icon change handler (business logic)
  const handleChangeIcon = async (value: IconValue) => {
    if (!activity) return;

    const currentValues = form.getValues();

    if (value.type === "emoji") {
      form.setValues({
        ...currentValues,
        activity: {
          ...currentValues.activity,
          emoji: value.emoji || "",
        },
      });
      setIconFile(undefined);
      setIconPreview(undefined);
      // Delete uploaded icon if switching back to emoji
      if (activity.iconType === "upload") {
        await deleteIcon();
      }
    } else if (value.type === "upload") {
      form.setValues({
        ...currentValues,
        activity: {
          ...currentValues.activity,
          emoji: "📷", // Default emoji for uploaded icons
        },
      });
      setIconFile(value.file);
      setIconPreview(value.preview);
      // Upload icon immediately if file is selected
      if (value.file) {
        await uploadIcon(value.file);
      }
    }
  };

  return {
    formProps: {
      form,
      kindFields: kindFieldArray?.fields || [],
      isPending: isSubmitting,
    } as ActivityEditFormProps,
    iconProps: {
      value: iconValue,
      onChange: handleChangeIcon,
      pick: pickIcon,
    } as ActivityEditIconProps,
    actions: {
      onSubmit: form.handleSubmit(onSubmit),
      onDelete: handleDelete,
      onAddKind: handleAddKind,
      onRemoveKind: handleRemoveKind,
    } as ActivityEditActions,
  };
}
