import { useState } from "react";

import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuth } from "../../src/hooks/useAuth";
import { Alert } from "../../src/utils/AlertWrapper";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginId || !password) {
      Alert.alert("エラー", "ログインIDとパスワードを入力してください");
      return;
    }

    setIsLoading(true);
    try {
      await login(loginId, password);
    } catch (error) {
      Alert.alert(
        "ログインエラー",
        "ログインIDまたはパスワードが間違っています",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToSignup = () => {
    router.push("/(auth)/signup");
  };

  return (
    <>
      <View className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <Text className="text-xl font-semibold text-center mb-6">
          ログインする
        </Text>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            ログインID
          </Text>
          <TextInput
            className="w-full h-9 px-3 py-1 rounded-md border border-gray-300 text-base"
            placeholder="ログインID"
            value={loginId}
            onChangeText={setLoginId}
            autoCapitalize="none"
            autoComplete="username"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            パスワード
          </Text>
          <TextInput
            className="w-full h-9 px-3 py-1 rounded-md border border-gray-300 text-base"
            placeholder="パスワード"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />
        </View>

        <TouchableOpacity
          className={`w-full h-9 bg-blue-600 rounded-md items-center justify-center ${
            isLoading ? "opacity-60" : ""
          }`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text className="text-white text-sm font-medium">
            {isLoading ? "ログイン中..." : "ログイン"}
          </Text>
        </TouchableOpacity>

        <View className="mt-4 flex-row justify-center">
          <Text className="text-sm text-gray-600">
            アカウントをお持ちでない方は
          </Text>
          <TouchableOpacity onPress={handleSwitchToSignup}>
            <Text className="text-sm text-blue-600 font-medium ml-1">
              新規登録
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <StatusBar style="auto" />
    </>
  );
}
