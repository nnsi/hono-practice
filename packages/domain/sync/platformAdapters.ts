export type NetworkAdapter = {
  isOnline(): boolean;
  onOnline(callback: () => void): () => void;
};

export type StorageAdapter = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
