import { QueryClient } from "@tanstack/react-query";

// グローバルなQueryClientインスタンス
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 10 * 60 * 1000, // 10分（旧cacheTime）
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
