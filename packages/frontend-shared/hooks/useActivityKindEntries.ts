import { COLOR_PALETTE } from "../utils/colorUtils";
import type { ReactHooks } from "./types";

export type KindEntry = {
  id?: string | number;
  name: string;
  color: string;
};

type Deps = {
  react: Pick<ReactHooks, "useState" | "useCallback">;
};

export function createUseActivityKindEntries(deps: Deps) {
  const { useState, useCallback } = deps.react;

  return function useActivityKindEntries(initial: KindEntry[] = []) {
    const [kinds, setKinds] = useState<KindEntry[]>(initial);
    const [nextKindId, setNextKindId] = useState(0);

    const addKind = useCallback(() => {
      setKinds((prev) => {
        const usedColors = new Set(prev.map((k) => k.color.toUpperCase()));
        const nextColor =
          COLOR_PALETTE.find((c) => !usedColors.has(c.toUpperCase())) ??
          COLOR_PALETTE[prev.length % COLOR_PALETTE.length];
        return [...prev, { id: nextKindId, name: "", color: nextColor }];
      });
      setNextKindId((n) => n + 1);
    }, [nextKindId]);

    const removeKind = useCallback((id: string | number) => {
      setKinds((prev) => prev.filter((k) => k.id !== id));
    }, []);

    const updateKindName = useCallback((id: string | number, text: string) => {
      setKinds((prev) =>
        prev.map((k) => (k.id === id ? { ...k, name: text } : k)),
      );
    }, []);

    const updateKindColor = useCallback(
      (id: string | number, color: string) => {
        setKinds((prev) =>
          prev.map((k) => (k.id === id ? { ...k, color } : k)),
        );
      },
      [],
    );

    return {
      kinds,
      setKinds,
      addKind,
      removeKind,
      updateKindName,
      updateKindColor,
    };
  };
}
