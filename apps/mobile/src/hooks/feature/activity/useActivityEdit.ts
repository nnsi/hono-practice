import {
  type UpdateActivityRequest,
  UpdateActivityRequestSchema,
} from "@dtos/request/UpdateActivityRequest";
import type { GetActivityResponse } from "@dtos/response";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createReactNativeFormAdapter,
  createReactNativeNotificationAdapter,
} from "@packages/frontend-shared/adapters";
import { createUseActivityEdit } from "@packages/frontend-shared/hooks/feature";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useFieldArray, useForm } from "react-hook-form";

import { apiClient, getAuthToken } from "../../../utils/apiClient";
import { getApiUrl } from "../../../utils/getApiUrl";
import { resizeImage } from "../../../utils/imageResizer";

export const useActivityEdit = (
  activity: GetActivityResponse | null,
  onClose: () => void,
) => {
  const queryClient = useQueryClient();

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

  // Create adapters and dependencies
  const dependencies = {
    form: createReactNativeFormAdapter<UpdateActivityRequest>(
      form as never,
      useFieldArray,
    ),
    notification: createReactNativeNotificationAdapter(),
    file: {
      pickImage: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (result.canceled || !result.assets?.[0]) {
          return null;
        }

        return {
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType || "image/jpeg",
          name: result.assets[0].fileName || "icon.jpg",
        };
      },
    },
    api: {
      updateActivity: async (params: {
        id: string;
        data: UpdateActivityRequest;
      }) => {
        await apiClient.users.activities[":id"].$put({
          param: { id: params.id },
          json: params.data,
        });
        queryClient.invalidateQueries({ queryKey: ["activity"] });
      },
      deleteActivity: async (id: string) => {
        await apiClient.users.activities[":id"].$delete({
          param: { id },
        });
        queryClient.invalidateQueries({ queryKey: ["activity"] });
      },
      uploadActivityIcon: async (params: {
        id: string;
        file: File | FormData;
      }) => {
        // For React Native, we receive a file with uri
        const fileUri =
          params.file instanceof FormData
            ? (params.file.get("file") as any)?.uri
            : (params.file as any).uri;

        if (!fileUri) {
          throw new Error("Invalid file input");
        }

        // Resize image and convert to base64
        const { base64, mimeType } = await resizeImage(fileUri, 256, 256);

        const API_URL = getApiUrl();
        const token = await getAuthToken();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `${API_URL}users/activities/${params.id}/icon`,
          {
            method: "POST",
            body: JSON.stringify({ base64, mimeType }),
            headers,
          },
        );

        if (!response.ok) {
          throw new Error("Failed to upload icon");
        }

        queryClient.invalidateQueries({ queryKey: ["activity"] });
      },
      deleteActivityIcon: async (id: string) => {
        const API_URL = getApiUrl();
        const token = await getAuthToken();
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}users/activities/${id}/icon`, {
          method: "DELETE",
          headers,
        });

        if (!response.ok) {
          throw new Error("Failed to delete icon");
        }

        queryClient.invalidateQueries({ queryKey: ["activity"] });
      },
    },
  };

  // Use the common hook
  const commonHook = createUseActivityEdit(dependencies, activity, onClose);

  // Return the common hook result with the original form instance for compatibility
  return {
    ...commonHook,
    // Return the original react-hook-form instance for UI components
    form,
  };
};
