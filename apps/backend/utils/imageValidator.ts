import { AppError } from "@backend/error";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

export async function validateImage(file: File): Promise<void> {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new AppError(
      `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
      400,
    );
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext),
  );

  if (!hasValidExtension) {
    throw new AppError(
      `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`,
      400,
    );
  }

  // Validate magic bytes (first few bytes of the file)
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!isValidImageMagicBytes(bytes)) {
    throw new AppError("Invalid image file format", 400);
  }
}

function isValidImageMagicBytes(bytes: Uint8Array): boolean {
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }

  // GIF
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return true;
  }

  // WebP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  return false;
}

export function generateIconKey(
  userId: string,
  activityId: string,
  isThumb = false,
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const suffix = isThumb ? "_thumb" : "";
  return `icons/${userId}/${activityId}_${timestamp}_${random}${suffix}.webp`;
}
