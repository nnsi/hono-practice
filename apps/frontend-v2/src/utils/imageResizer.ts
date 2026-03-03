export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // Create canvas and resize
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with quality adjustment for size control
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        let quality = 0.9;
        let base64 = "";

        // Reduce quality until file size is under 100KB
        const checkSize = () => {
          base64 = canvas.toDataURL(mimeType, quality);
          const sizeInBytes = Math.round((base64.length * 3) / 4);

          if (sizeInBytes > 100 * 1024 && quality > 0.1) {
            quality -= 0.1;
            checkSize();
          }
        };

        checkSize();

        // Remove data URL prefix to get pure base64
        const base64Data = base64.split(",")[1];

        resolve({ base64: base64Data, mimeType });
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}
