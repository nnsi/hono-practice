export type UploadedFile = {
  url: string;
  key: string;
  size: number;
  contentType: string;
};

export type StorageService = {
  upload: (
    file: File | Blob,
    key: string,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
    },
  ) => Promise<UploadedFile>;
  delete: (key: string) => Promise<void>;
  getUrl: (key: string) => string;
  exists: (key: string) => Promise<boolean>;
};

export { createStorageService } from "./storageFactory";
