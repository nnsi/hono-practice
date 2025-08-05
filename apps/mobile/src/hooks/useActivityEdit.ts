import { Alert } from "react-native";

import {
  createReactNativeFormAdapter,
  createReactNativeNotificationAdapter,
} from "@packages/frontend-shared/adapters";
import {
  createUseDeleteActivity,
  createUseDeleteActivityIcon,
  createUseUpdateActivity,
  createUseUploadActivityIcon,
} from "@packages/frontend-shared/hooks";
import { createUseActivityEdit } from "@packages/frontend-shared/hooks/feature";
import * as ImagePicker from "expo-image-picker";

import { apiClient } from "../utils/apiClient";

import type { UpdateActivityRequest } from "@packages/types";
import type { GetActivityResponse } from "@packages/types/response";

// モバイル版のアクティビティ編集フック
export const useActivityEdit = (
  activity: GetActivityResponse | null,
  onClose: () => void,
) => {
  // Form adapter
  const form = createReactNativeFormAdapter<UpdateActivityRequest>();

  // API hooks
  const updateActivity = createUseUpdateActivity({ apiClient });
  const deleteActivity = createUseDeleteActivity({ apiClient });
  const uploadIcon = createUseUploadActivityIcon({ apiClient });
  const deleteIcon = createUseDeleteActivityIcon({ apiClient });

  // Create dependencies
  const dependencies = {
    form,
    notification: createReactNativeNotificationAdapter(Alert),
    file: {
      pickImage: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          return {
            uri: asset.uri,
            type: asset.type || "image/jpeg",
            name: asset.fileName || "photo.jpg",
          };
        }
        return null;
      },
      createFormData: (file) => {
        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          type: file.type || "image/jpeg",
          name: file.name || "photo.jpg",
        } as any);
        return formData;
      },
    },
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
        await uploadIcon.mutateAsync(params);
      },
      deleteActivityIcon: async (id: string) => {
        await deleteIcon.mutateAsync(id);
      },
    },
  };

  // Use the common hook
  return createUseActivityEdit(dependencies, activity, onClose);
};
