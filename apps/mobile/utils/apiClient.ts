import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { type AxiosError } from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3456";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post("/auth/token");
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        await AsyncStorage.removeItem("user");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const api = {
  auth: {
    login: async (loginId: string, password: string) => {
      const response = await apiClient.post("/auth/login", {
        loginId,
        password,
      });
      return response.data;
    },

    googleLogin: async (idToken: string) => {
      const response = await apiClient.post("/auth/google", { idToken });
      return response.data;
    },

    logout: async () => {
      const response = await apiClient.post("/auth/logout");
      return response.data;
    },

    refreshToken: async () => {
      const response = await apiClient.post("/auth/token");
      return response.data;
    },

    linkGoogle: async (idToken: string) => {
      const response = await apiClient.post("/auth/google/link", { idToken });
      return response.data;
    },
  },

  user: {
    me: async () => {
      const response = await apiClient.get("/user/me");
      return response.data;
    },

    create: async (data: {
      name: string;
      loginId: string;
      password: string;
    }) => {
      const response = await apiClient.post("/user", data);
      return response.data;
    },
  },

  activities: {
    list: async () => {
      const response = await apiClient.get("/users/activities");
      return response.data;
    },

    create: async (data: {
      name: string;
      emoji: string;
      activityKindId: string;
    }) => {
      const response = await apiClient.post("/users/activities", data);
      return response.data;
    },

    update: async (id: string, data: { name: string; emoji: string }) => {
      const response = await apiClient.put(`/users/activities/${id}`, data);
      return response.data;
    },

    delete: async (id: string) => {
      const response = await apiClient.delete(`/users/activities/${id}`);
      return response.data;
    },
  },

  activityLogs: {
    list: async (date: string) => {
      const response = await apiClient.get("/users/activity-logs", {
        params: { date },
      });
      return response.data;
    },

    create: async (data: {
      activityId: string;
      count: number;
      date: string;
    }) => {
      const response = await apiClient.post("/users/activity-logs", data);
      return response.data;
    },

    update: async (id: string, data: { count: number }) => {
      const response = await apiClient.put(`/users/activity-logs/${id}`, data);
      return response.data;
    },

    delete: async (id: string) => {
      const response = await apiClient.delete(`/users/activity-logs/${id}`);
      return response.data;
    },

    stats: async (date: string) => {
      const response = await apiClient.get("/users/activity-logs/stats", {
        params: { date },
      });
      return response.data;
    },
  },

  tasks: {
    list: async (date: string) => {
      const response = await apiClient.get("/users/tasks", {
        params: { date },
      });
      return response.data;
    },

    create: async (data: { title: string; date: string }) => {
      const response = await apiClient.post("/users/tasks", data);
      return response.data;
    },

    update: async (id: string, data: { title?: string; done?: boolean }) => {
      const response = await apiClient.put(`/users/tasks/${id}`, data);
      return response.data;
    },

    delete: async (id: string) => {
      const response = await apiClient.delete(`/users/tasks/${id}`);
      return response.data;
    },
  },
};
