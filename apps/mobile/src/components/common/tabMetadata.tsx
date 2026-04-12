import type { TabKey } from "@packages/domain/user/tabPreferenceSchema";
import type { LucideIcon } from "lucide-react-native";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FileText,
  LayoutGrid,
  Target,
} from "lucide-react-native";

export type MobileTabMetadata = {
  key: TabKey;
  label: string;
  routeName: string;
  icon: LucideIcon;
};

export const MOBILE_TAB_METADATA: Record<TabKey, MobileTabMetadata> = {
  home: {
    key: "home",
    label: "Actiko",
    routeName: "index",
    icon: LayoutGrid,
  },
  daily: {
    key: "daily",
    label: "Daily",
    routeName: "daily",
    icon: CalendarDays,
  },
  stats: {
    key: "stats",
    label: "Stats",
    routeName: "stats",
    icon: BarChart3,
  },
  goals: {
    key: "goals",
    label: "Goal",
    routeName: "goals",
    icon: Target,
  },
  tasks: {
    key: "tasks",
    label: "Tasks",
    routeName: "tasks",
    icon: CheckSquare,
  },
  notes: {
    key: "notes",
    label: "Notes",
    routeName: "notes",
    icon: FileText,
  },
};
