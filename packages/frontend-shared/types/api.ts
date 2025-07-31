export type ApiConfig = {
  baseUrl: string;
  platform: "web" | "mobile";
};

export type RequestContext = {
  isAuthEndpoint: boolean;
  requiresAuth: boolean;
};

// API レスポンスの共通型
export type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
};

// ページネーションの共通型
export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
};
