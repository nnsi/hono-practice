import { Tabs, useRouter } from "expo-router";
import {
  LayoutGrid,
  CalendarDays,
  Target,
  BarChart3,
  CheckSquare,
  Settings,
} from "lucide-react-native";
import { TouchableOpacity, View, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { LucideIcon } from "lucide-react-native";

const TAB_ITEMS: {
  name: string;
  title: string;
  icon: LucideIcon;
}[] = [
  { name: "index", title: "Actiko", icon: LayoutGrid },
  { name: "daily", title: "Daily", icon: CalendarDays },
  { name: "stats", title: "Stats", icon: BarChart3 },
  { name: "goals", title: "Goal", icon: Target },
  { name: "tasks", title: "Tasks", icon: CheckSquare },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 10 + insets.bottom,
        borderTopWidth: 1,
        borderTopColor: "rgba(231,229,228,0.5)",
        backgroundColor: "rgba(255,255,255,0.82)",
        ...(Platform.OS === "web"
          ? ({
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
            } as Record<string, string>)
          : {}),
      }}
    >
      {TAB_ITEMS.map((tab, index) => {
        const isActive = state.index === index;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => navigation.navigate(state.routes[index].name)}
            activeOpacity={0.7}
            style={{
              alignItems: "center",
              gap: 2,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <Icon
              size={20}
              color={isActive ? "#d97706" : "#a8a29e"}
            />
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 0.5,
                color: isActive ? "#d97706" : "#a8a29e",
                fontWeight: isActive ? "600" : "500",
              }}
            >
              {tab.title}
            </Text>
            {/* Active indicator pill */}
            <View
              style={{
                width: 16,
                height: 2.5,
                borderRadius: 9999,
                backgroundColor: isActive ? "#f59e0b" : "transparent",
                marginTop: 1,
              }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

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
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerRight: settingsButton,
        headerStyle: {
          backgroundColor: "rgba(255,255,255,0.95)",
        },
        headerTitleStyle: {
          color: "#1c1917",
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Actiko" }} />
      <Tabs.Screen name="daily" options={{ title: "Daily" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="goals" options={{ title: "Goal" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: "Settings",
          headerRight: () => null,
        }}
      />
    </Tabs>
  );
}
