import { useState } from "react";

import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { StatusBar } from "expo-status-bar";

import { LoginScreen } from "../../src/screens/LoginScreen";
import { SignupScreen } from "../../src/screens/SignupScreen";

export default function AuthTabs() {
  const [activeTab, setActiveTab] = useState<"login" | "new">("login");

  return (
    <>
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View className="w-full max-w-xs mx-auto">
          <View className="w-full mb-4 flex-row">
            <TouchableOpacity
              className={`flex-1 py-2 ${activeTab === "login" ? "border-b-2 border-blue-600" : ""}`}
              onPress={() => setActiveTab("login")}
            >
              <Text
                className={`text-center font-medium ${activeTab === "login" ? "text-blue-600" : "text-gray-500"}`}
              >
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 ${activeTab === "new" ? "border-b-2 border-blue-600" : ""}`}
              onPress={() => setActiveTab("new")}
            >
              <Text
                className={`text-center font-medium ${activeTab === "new" ? "text-blue-600" : "text-gray-500"}`}
              >
                New
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "login" ? (
            <LoginScreen onSwitchToSignup={() => setActiveTab("new")} />
          ) : (
            <SignupScreen onSwitchToLogin={() => setActiveTab("login")} />
          )}
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </>
  );
}
