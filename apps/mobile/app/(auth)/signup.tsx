import { useState } from "react";

import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../../src/contexts/AuthContext";
import { Alert } from "../../src/utils/AlertWrapper";

export default function Signup() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !loginId || !password) {
      Alert.alert("エラー", "すべての項目を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      await signup(loginId, password, name);
    } catch (error) {
      Alert.alert(
        "登録エラー",
        error instanceof Error ? error.message : "登録に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    router.push("/(auth)/login");
  };

  return (
    <>
      <View className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <Text className="text-xl font-semibold text-center mb-6">新規登録</Text>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">お名前</Text>
          <TextInput
            className="w-full h-9 px-3 py-1 rounded-md border border-gray-300 text-base"
            placeholder="名前"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />
        </View>

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
            autoComplete="username-new"
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
            autoComplete="password-new"
          />
        </View>

        <TouchableOpacity
          className={`w-full h-9 bg-blue-600 rounded-md items-center justify-center ${
            isLoading ? "opacity-60" : ""
          }`}
          onPress={handleSignup}
          disabled={isLoading}
        >
          <Text className="text-white text-sm font-medium">
            {isLoading ? "登録中..." : "登録"}
          </Text>
        </TouchableOpacity>

        <View className="mt-4 flex-row justify-center">
          <Text className="text-sm text-gray-600">
            既にアカウントをお持ちの方は
          </Text>
          <TouchableOpacity onPress={handleSwitchToLogin}>
            <Text className="text-sm text-blue-600 font-medium ml-1">
              ログイン
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <StatusBar style="auto" />
    </>
  );
}
