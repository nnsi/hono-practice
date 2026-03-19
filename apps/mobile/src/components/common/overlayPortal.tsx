import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";

import { StyleSheet, View } from "react-native";

// Module-level ref to OverlayHost's setState.
// Only one overlay is shown at a time (single-slot portal).
let _setContent: ((content: ReactNode | null) => void) | null = null;

/**
 * Renders children into the OverlayHost at the root layout level.
 * Mount this conditionally — unmounting clears the overlay.
 */
export function OverlayPortal({ children }: { children: ReactNode }) {
  // Sync content to host before paint (avoids 1-frame stale content)
  useLayoutEffect(() => {
    _setContent?.(children);
  });

  // Clear overlay on unmount
  useEffect(() => {
    return () => _setContent?.(null);
  }, []);

  return null;
}

/**
 * Place once in the root layout. Renders overlay content above everything.
 */
export function OverlayHost() {
  const [content, setContent] = useState<ReactNode | null>(null);

  useEffect(() => {
    _setContent = setContent;
    return () => {
      _setContent = null;
    };
  }, []);

  if (!content) return null;

  return <View style={[StyleSheet.absoluteFill, styles.host]}>{content}</View>;
}

const styles = StyleSheet.create({
  host: {
    zIndex: 1000,
    elevation: 1000,
  },
});
