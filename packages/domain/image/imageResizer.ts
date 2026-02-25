export type ImageResizerResult = {
  base64: string;
  mimeType: string;
};

export type ImageResizer = {
  resizeImage(
    file: Blob,
    maxWidth: number,
    maxHeight: number,
  ): Promise<ImageResizerResult>;
};
