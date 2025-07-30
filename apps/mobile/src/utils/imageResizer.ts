import { SaveFormat, manipulateAsync } from "expo-image-manipulator";

export async function resizeImage(
  uri: string,
  maxWidth: number,
  maxHeight: number,
): Promise<{ base64: string; mimeType: string }> {
  try {
    // リサイズ処理
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      { compress: 0.9, format: SaveFormat.JPEG, base64: true },
    );

    if (!result.base64) {
      throw new Error("Failed to convert image to base64");
    }

    return {
      base64: result.base64,
      mimeType: "image/jpeg",
    };
  } catch (error) {
    console.error("Image resize error:", error);
    throw error;
  }
}
