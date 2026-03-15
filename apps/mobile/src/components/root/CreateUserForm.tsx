import { useState } from "react";

import { useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuthContext } from "../../../app/_layout";
import { LegalModal } from "../common/LegalModal";

export function CreateUserForm() {
  const { register } = useAuthContext();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );

  const handleRegister = async () => {
    if (!loginId || !password) {
      setError("IDとパスワードを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(name, loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white">
      <Text className="text-3xl font-bold text-center mb-8">
        アカウント作成
      </Text>

      {error ? (
        <Text className="text-red-500 text-center mb-4">{error}</Text>
      ) : null}

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="名前（任意）"
        value={name}
        onChangeText={setName}
        autoCorrect={false}
      />

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="ログインID"
        value={loginId}
        onChangeText={setLoginId}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text className="text-xs text-gray-400 leading-5 mb-4">
        新規登録することで、
        <Text className="underline" onPress={() => setLegalModal("terms")}>
          利用規約
        </Text>
        と
        <Text className="underline" onPress={() => setLegalModal("privacy")}>
          プライバシーポリシー
        </Text>
        に同意したものとみなします。
      </Text>

      <TouchableOpacity
        className={`bg-blue-500 rounded-lg py-3 items-center ${loading ? "opacity-50" : ""}`}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? "登録中..." : "登録"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.back()}
      >
        <Text className="text-blue-500">ログインに戻る</Text>
      </TouchableOpacity>
      {legalModal && (
        <LegalModal
          visible={!!legalModal}
          type={legalModal}
          onClose={() => setLegalModal(null)}
        />
      )}
    </View>
  );
}
