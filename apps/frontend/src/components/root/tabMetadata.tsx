import type { ComponentType } from "react";

import type { TabKey } from "@packages/domain/user/tabPreferenceSchema";
import {
  BarChart3,
  CheckSquare,
  FileText,
  LayoutGrid,
  Target,
} from "lucide-react";

export type WebTabMetadata = {
  key: TabKey;
  label: string;
  to: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

export const WEB_TAB_METADATA: Record<TabKey, WebTabMetadata> = {
  home: {
    key: "home",
    label: "Actiko",
    to: "/actiko",
    icon: LayoutGrid,
  },
  stats: {
    key: "stats",
    label: "Stats",
    to: "/stats",
    icon: BarChart3,
  },
  goals: {
    key: "goals",
    label: "Goal",
    to: "/goals",
    icon: Target,
  },
  tasks: {
    key: "tasks",
    label: "Tasks",
    to: "/tasks",
    icon: CheckSquare,
  },
  notes: {
    key: "notes",
    label: "Notes",
    to: "/notes",
    icon: FileText,
  },
};
