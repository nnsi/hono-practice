let accessToken: string | null = null;

export const tokenHolder = {
  getToken: () => accessToken,
  setToken: (token: string | null) => {
    accessToken = token;
  },
};
