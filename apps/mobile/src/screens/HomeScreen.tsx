import { useState } from "react";

import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../services/apiClient";

export function HomeScreen() {
  const { user, logout } = useAuth();
  const [testResult, setTestResult] = useState<string>("");

  const testAuthenticatedAPI = async () => {
    try {
      // 認証が必要なAPIエンドポイントをテスト
      const response = await apiClient.users.activities.$get();
      if (response.ok) {
        const data = await response.json();
        setTestResult(`Activities API成功: ${data.length}件のアクティビティ`);
        Alert.alert(
          "成功",
          `Activities APIへのアクセスに成功しました\n${data.length}件のアクティビティを取得`,
        );
      } else {
        setTestResult(`APIエラー: ${response.status}`);
        Alert.alert("エラー", `APIアクセスに失敗しました: ${response.status}`);
      }
    } catch (error) {
      setTestResult(`エラー: ${error}`);
      Alert.alert("エラー", "APIアクセス中にエラーが発生しました");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Actiko Home</Text>
      <Text style={styles.welcome}>
        ようこそ、{user?.name || "ユーザー"}さん！
      </Text>

      <TouchableOpacity
        style={styles.testButton}
        onPress={testAuthenticatedAPI}
      >
        <Text style={styles.testButtonText}>認証APIテスト</Text>
      </TouchableOpacity>

      {testResult ? <Text style={styles.testResult}>{testResult}</Text> : null}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>ログアウト</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
  },
  welcome: {
    fontSize: 20,
    marginBottom: 24,
    color: "#666",
  },
  testButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  testButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  testResult: {
    fontSize: 14,
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
