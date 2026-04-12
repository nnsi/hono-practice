import { type DragEvent, useEffect, useRef, useState } from "react";

import {
  FIXED_TAB_KEY,
  type TabKey,
  getHiddenTabKeys,
  hideTabKey,
  reorderTabKeys,
  showTabKey,
} from "@packages/domain/user/tabPreferenceSchema";

import {
  savePendingTabPreference,
  useTabPreference,
} from "./tabPreferenceStore";

export function useTabCustomization() {
  const { preference } = useTabPreference();
  const [draggingKey, setDraggingKey] = useState<TabKey | null>(null);
  const [draftTabs, setDraftTabs] = useState(preference.tabs);
  const [showMaxWarning, setShowMaxWarning] = useState(false);
  const dragSourceIndexRef = useRef<number | null>(null);
  const dragTargetIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!draggingKey) {
      setDraftTabs(preference.tabs);
    }
  }, [draggingKey, preference.tabs]);

  const visibleTabs = draggingKey ? draftTabs : preference.tabs;
  const hiddenKeys = getHiddenTabKeys(visibleTabs);

  const commitTabs = (tabs: readonly TabKey[]) => {
    setShowMaxWarning(false);
    savePendingTabPreference(tabs);
  };

  const finishDrag = () => {
    const fromIndex = dragSourceIndexRef.current;
    const toIndex = dragTargetIndexRef.current;
    if (fromIndex == null) {
      return;
    }
    dragSourceIndexRef.current = null;
    dragTargetIndexRef.current = null;
    setDraggingKey(null);

    if (
      toIndex == null ||
      fromIndex === toIndex ||
      fromIndex <= 0 ||
      toIndex <= 0
    ) {
      setDraftTabs(preference.tabs);
      return;
    }

    const next = reorderTabKeys(preference.tabs, fromIndex, toIndex);
    setDraftTabs(next);
    commitTabs(next);
  };

  return {
    preference,
    visibleTabs,
    hiddenKeys,
    draggingKey,
    showMaxWarning,
    fixedTabKey: FIXED_TAB_KEY,
    hideTab: (key: TabKey) => commitTabs(hideTabKey(visibleTabs, key)),
    showTab: (key: TabKey) => {
      const next = showTabKey(visibleTabs, key);
      if (!next) {
        setShowMaxWarning(true);
        return;
      }
      commitTabs(next);
    },
    handleDragStart:
      (key: TabKey, index: number) => (event: DragEvent<HTMLDivElement>) => {
        if (key === FIXED_TAB_KEY) {
          return;
        }
        dragSourceIndexRef.current = index;
        dragTargetIndexRef.current = index;
        setDraggingKey(key);
        setDraftTabs(preference.tabs);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", key);
      },
    handleDragOver: (index: number) => (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const fromIndex = dragSourceIndexRef.current;
      if (fromIndex == null || fromIndex === index) {
        return;
      }
      dragTargetIndexRef.current = index;
      setDraftTabs(reorderTabKeys(preference.tabs, fromIndex, index));
    },
    finishDrag,
  };
}
