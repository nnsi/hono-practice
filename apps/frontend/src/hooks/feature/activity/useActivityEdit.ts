import { useEffect } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { tokenStore } from "@frontend/utils/tokenStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const api = apiClient;
  const queryClient = useQueryClient();
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

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: UpdateActivityRequest) => {
      if (!activity) return;
      return api.users.activities[":id"].$put({
        param: { id: activity.id },
        json: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      onClose();
    },
  });

  const handleDelete = async () => {
    if (!activity) return;
    const res = await api.users.activities[":id"].$delete({
      param: { id: activity.id },
    });
    if (res.status !== 200) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["activity"] });
    onClose();
  };

  const onSubmit = (data: UpdateActivityRequest) => {
    if (!activity) return;
    mutate(data);
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

    const formData = new FormData();
    formData.append("file", file);

    try {
      const API_URL =
        import.meta.env.MODE === "development"
          ? import.meta.env.VITE_API_URL ||
            `http://${document.domain}:${import.meta.env.VITE_API_PORT || "3456"}/`
          : import.meta.env.VITE_API_URL;

      const token = tokenStore.getToken();
      console.log("Token for icon upload:", token);
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      console.log(
        "Uploading to:",
        `${API_URL}users/activities/${activity.id}/icon`,
      );
      console.log("Headers:", headers);

      const response = await fetch(
        `${API_URL}users/activities/${activity.id}/icon`,
        {
          method: "POST",
          body: formData,
          headers,
        },
      );

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["activity"] });
      }
    } catch (error) {
      console.error("Failed to upload icon:", error);
    }
  };

  // アイコン削除
  const deleteIcon = async () => {
    if (!activity) return;

    try {
      const API_URL =
        import.meta.env.MODE === "development"
          ? import.meta.env.VITE_API_URL ||
            `http://${document.domain}:${import.meta.env.VITE_API_PORT || "3456"}/`
          : import.meta.env.VITE_API_URL;

      const token = tokenStore.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_URL}users/activities/${activity.id}/icon`,
        {
          method: "DELETE",
          headers,
        },
      );

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["activity"] });
      }
    } catch (error) {
      console.error("Failed to delete icon:", error);
    }
  };

  return {
    form,
    kindFields,
    isPending,
    onSubmit,
    handleDelete,
    handleRemoveKind,
    handleAddKind,
    uploadIcon,
    deleteIcon,
  };
};
