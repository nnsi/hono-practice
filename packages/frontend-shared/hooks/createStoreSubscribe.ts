/**
 * useSyncExternalStore 用 subscribe を生成する。
 * - listener 登録のたびに onSubscribe を呼ぶ（lazy ロードの起動などに使う）
 * - 外部ストレージ変更（Web の "storage" event 等）を listener が 1 つ以上
 *   いる間だけ購読し、変更時に reload を呼ぶ
 */
export function createStoreSubscribe(opts: {
  listeners: Set<() => void>;
  onSubscribe?: () => void;
  reload: () => void;
  subscribeExternalChange?: (reload: () => void) => () => void;
}) {
  const { listeners, onSubscribe, reload, subscribeExternalChange } = opts;
  let externalUnsubscribe: (() => void) | null = null;

  return function subscribe(listener: () => void) {
    listeners.add(listener);
    onSubscribe?.();
    if (subscribeExternalChange && externalUnsubscribe === null) {
      externalUnsubscribe = subscribeExternalChange(reload);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && externalUnsubscribe) {
        externalUnsubscribe();
        externalUnsubscribe = null;
      }
    };
  };
}
