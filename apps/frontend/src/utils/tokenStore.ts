// Global token store for access from apiClient
let accessToken: string | null = null;

export const tokenStore = {
  getToken: () => accessToken,
  setToken: (token: string | null) => {
    accessToken = token;
  },
};
