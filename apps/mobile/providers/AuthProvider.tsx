import AsyncStorage from "@react-native-async-storage/async-storage";
import type React from "react";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../utils/apiClient";

type User = {
  id: string;
  name: string;
  loginId: string;
  hasGoogleLinked: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  signup: (name: string, loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  linkGoogle: (idToken: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        await refreshUser();
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.user.me();
      const userData = response.user;
      setUser(userData);
      await AsyncStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
      await AsyncStorage.removeItem("user");
    }
  };

  const login = async (loginId: string, password: string) => {
    const response = await api.auth.login(loginId, password);
    const userData = response.user;
    setUser(userData);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
  };

  const googleLogin = async (idToken: string) => {
    const response = await api.auth.googleLogin(idToken);
    const userData = response.user;
    setUser(userData);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
  };

  const signup = async (name: string, loginId: string, password: string) => {
    const response = await api.user.create({ name, loginId, password });
    const userData = response.user;
    setUser(userData);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    await AsyncStorage.removeItem("user");
  };

  const linkGoogle = async (idToken: string) => {
    await api.auth.linkGoogle(idToken);
    await refreshUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        googleLogin,
        signup,
        logout,
        refreshUser,
        linkGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
