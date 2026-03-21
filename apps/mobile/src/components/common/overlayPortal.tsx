import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
} from "react";

import { StyleSheet, View } from "react-native";

type OverlayLayer = { id: string; content: ReactNode };

let _setLayers:
  | ((fn: (prev: OverlayLayer[]) => OverlayLayer[]) => void)
  | null = null;

/**
 * Renders children into the OverlayHost at the root layout level.
 * Multiple OverlayPortals stack on top of each other (FIFO order).
 */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const id = useId();

  useLayoutEffect(() => {
    _setLayers?.((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { id, content: children };
        return next;
      }
      return [...prev, { id, content: children }];
    });
  });

  useEffect(() => {
    return () => {
      _setLayers?.((prev) => prev.filter((l) => l.id !== id));
    };
  }, [id]);

  return null;
}

/**
 * Place once in the root layout. Renders overlay content above everything.
 */
export function OverlayHost() {
  const [layers, setLayers] = useState<OverlayLayer[]>([]);

  useEffect(() => {
    _setLayers = setLayers;
    return () => {
      _setLayers = null;
    };
  }, []);

  if (layers.length === 0) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.host]}>
      {layers.map((layer) => (
        <View key={layer.id} style={StyleSheet.absoluteFill}>
          {layer.content}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    zIndex: 1000,
    elevation: 1000,
  },
});
