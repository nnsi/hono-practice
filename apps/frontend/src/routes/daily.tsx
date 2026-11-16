import { createFileRoute, redirect } from "@tanstack/react-router";

// Daily 画面は Actiko 画面へ統合した。ブックマークや統合前のタブ設定から来た場合に備えて転送する。
export const Route = createFileRoute("/daily")({
  beforeLoad: () => {
    throw redirect({ to: "/actiko", replace: true });
  },
});
