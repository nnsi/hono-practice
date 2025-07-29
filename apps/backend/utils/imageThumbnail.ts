import { AppError } from "@backend/error";
import sharp from "sharp";


const THUMBNAIL_SIZE = 512;
const THUMBNAIL_QUALITY = 85;

export async function generateThumbnail(
  inputBuffer: ArrayBuffer,
  options?: {
    size?: number;
    quality?: number;
    format?: "webp" | "jpeg" | "png";
  },
): Promise<Buffer> {
  const size = options?.size || THUMBNAIL_SIZE;
  const quality = options?.quality || THUMBNAIL_QUALITY;
  const format = options?.format || "webp";

  try {
    const sharpInstance = sharp(Buffer.from(inputBuffer));

    // Get metadata to determine if we need to resize
    const metadata = await sharpInstance.metadata();

    // Only resize if image is larger than target size
    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > size || metadata.height > size)
    ) {
      sharpInstance.resize(size, size, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to specified format with quality
    switch (format) {
      case "webp":
        sharpInstance.webp({ quality });
        break;
      case "jpeg":
        sharpInstance.jpeg({ quality });
        break;
      case "png":
        sharpInstance.png({ quality });
        break;
    }

    return await sharpInstance.toBuffer();
  } catch (error) {
    throw new AppError("Failed to generate thumbnail", 500);
  }
}

export async function getImageMetadata(inputBuffer: ArrayBuffer) {
  try {
    const metadata = await sharp(Buffer.from(inputBuffer)).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
    };
  } catch (error) {
    throw new AppError("Failed to get image metadata", 500);
  }
}
