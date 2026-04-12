import { useEffect, useRef, useState } from "react";

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

const DRAG_STEP = 72;

export function useTabCustomization() {
  const { preference } = useTabPreference();
  const [draggingKey, setDraggingKey] = useState<TabKey | null>(null);
  const [draftTabs, setDraftTabs] = useState(preference.tabs);
  const [showMaxWarning, setShowMaxWarning] = useState(false);
  const dragSourceIndexRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
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
    void savePendingTabPreference(tabs);
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
    startDrag: (key: TabKey, index: number, pageY: number) => {
      if (key === FIXED_TAB_KEY) {
        return;
      }
      dragSourceIndexRef.current = index;
      dragTargetIndexRef.current = index;
      dragStartYRef.current = pageY;
      setDraggingKey(key);
      setDraftTabs(preference.tabs);
    },
    updateDrag: (pageY: number) => {
      const fromIndex = dragSourceIndexRef.current;
      if (fromIndex == null || fromIndex <= 0) {
        return;
      }
      const delta = pageY - dragStartYRef.current;
      const lastIndex = preference.tabs.length - 1;
      const targetIndex = Math.max(
        1,
        Math.min(lastIndex, fromIndex + Math.round(delta / DRAG_STEP)),
      );
      if (targetIndex === dragTargetIndexRef.current) {
        return;
      }
      dragTargetIndexRef.current = targetIndex;
      setDraftTabs(reorderTabKeys(preference.tabs, fromIndex, targetIndex));
    },
    finishDrag,
  };
}
