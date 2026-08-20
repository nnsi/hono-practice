import type { AdminAuthUsecase } from "./adminAuthUsecase";

export function newAdminAuthHandler(usecase: AdminAuthUsecase) {
  return {
    googleLogin: (credential: string) => usecase.googleLogin(credential),
    devLogin: (origin: string, host: string) => usecase.devLogin(origin, host),
    getSession: (token: string | undefined) => usecase.getSession(token),
    logout: (token: string | undefined) => usecase.logout(token),
  };
}

export type AdminAuthHandler = ReturnType<typeof newAdminAuthHandler>;
