# Frontend

- 同期対象データは Dexie repository に保存し、`useLiveQuery` で読む。syncEngine が同期する。表示用集計はローカルデータと共有計算関数を使う。
- TanStack Query は API キー・subscription などサーバー専用データに使う。`useEffect` 内で fetch しない。
- API の snake_case 変換は既存の型付き `apiMappers.ts` を使う。
- UI とロジックは既存の同階層 `use*.ts` フック構成に合わせる。モーダルは `ModalOverlay`、確認はインライン 2 段階、アイコンは Lucide を使う。
- route 追加時は Vite の TanStack Router plugin に生成させる。`routeTree.gen.ts` を手編集しない。
- 接続先はこの workspace の `.env` と `vite.config.ts` を確認する。UI 変更は操作と狭い幅（目安 375px）、キーボード・hover 依存を確認する。
