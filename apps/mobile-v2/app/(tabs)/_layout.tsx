import { Tabs, useRouter } from "expo-router";
import {
  Zap,
  CalendarDays,
  Target,
  BarChart3,
  CheckSquare,
  Settings,
} from "lucide-react-native";
import { TouchableOpacity } from "react-native";

export default function TabLayout() {
  const router = useRouter();

  const settingsButton = () => (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/settings")}
      style={{ marginRight: 12, padding: 6 }}
    >
      <Settings size={20} color="#a8a29e" />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#d97706",
        tabBarInactiveTintColor: "#a8a29e",
        headerShown: true,
        headerRight: settingsButton,
        headerStyle: {
          backgroundColor: "rgba(255,255,255,0.95)",
        },
        headerTitleStyle: {
          color: "#1c1917",
          fontWeight: "600",
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#e7e5e4",
          backgroundColor: "rgba(255,255,255,0.95)",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Actiko",
          tabBarIcon: ({ color, size }) => <Zap size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily"
        options={{
          title: "Daily",
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goal",
          tabBarIcon: ({ color, size }) => (
            <Target size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <CheckSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: "Settings",
          headerRight: () => null,
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
