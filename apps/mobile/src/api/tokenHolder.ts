let accessToken: string | null = null;

export const tokenHolder = {
  getToken: () => accessToken,
  setToken: (token: string | null) => {
    accessToken = token;
  },
};

export function setToken(token: string) {
  tokenHolder.setToken(token);
}

export function clearToken() {
  tokenHolder.setToken(null);
}
