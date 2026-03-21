import { useEffect, useState } from "react";

import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { activityRepository } from "../../repositories/activityRepository";

type Activity = {
  id: string;
  iconType: "emoji" | "upload" | "generate";
};

export function useActivityIconPicker(activity: Activity | null) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentIconType, setCurrentIconType] = useState<
    "emoji" | "upload" | "generate"
  >("emoji");
  const [uploadedBlob, setUploadedBlob] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);

  useEffect(() => {
    if (!activity) return;
    setCurrentIconType(activity.iconType);
    if (activity.iconType === "upload") {
      activityRepository
        .getActivityIconBlob(activity.id)
        .then((blob) => {
          if (blob)
            setUploadedBlob({ base64: blob.base64, mimeType: blob.mimeType });
        })
        .catch(() => {});
    } else {
      setUploadedBlob(null);
    }
  }, [activity]);

  const handlePickImage = async () => {
    if (!activity) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;

      setIsUploadingImage(true);
      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.PNG },
      );
      const base64 = await readAsStringAsync(manipulated.uri, {
        encoding: EncodingType.Base64,
      });

      await activityRepository.saveActivityIconBlob(
        activity.id,
        base64,
        "image/png",
      );
      await activityRepository.updateActivity(activity.id, {
        iconType: "upload",
      });
      setCurrentIconType("upload");
      setUploadedBlob({ base64, mimeType: "image/png" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleClearImage = async () => {
    if (!activity) return;
    await activityRepository.clearActivityIcon(activity.id);
    setCurrentIconType("emoji");
    setUploadedBlob(null);
  };

  return {
    isUploadingImage,
    currentIconType,
    setCurrentIconType,
    uploadedBlob,
    setUploadedBlob,
    handlePickImage,
    handleClearImage,
  };
}
