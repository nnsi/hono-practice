/**
 * 時間関連の操作を抽象化するインターフェース
 * setTimeout/setInterval/Date.nowなどの実装を差し替え可能にする
 */
export type TimeProvider = {
  /**
   * 現在時刻を取得（Date.now()相当）
   * @returns エポックミリ秒
   */
  now: () => number;

  /**
   * 現在のDateオブジェクトを取得
   * @returns Dateオブジェクト
   */
  getDate: () => Date;

  /**
   * 指定時間後にコールバックを実行
   * @param callback 実行する関数
   * @param delay 遅延時間（ミリ秒）
   * @returns タイマーID
   */
  setTimeout: (callback: () => void, delay: number) => number;

  /**
   * タイマーをクリア
   * @param id タイマーID
   */
  clearTimeout: (id: number) => void;

  /**
   * 指定間隔でコールバックを繰り返し実行
   * @param callback 実行する関数
   * @param interval 間隔（ミリ秒）
   * @returns タイマーID
   */
  setInterval: (callback: () => void, interval: number) => number;

  /**
   * インターバルをクリア
   * @param id タイマーID
   */
  clearInterval: (id: number) => void;

  /**
   * Promiseベースのsleep関数
   * @param ms スリープ時間（ミリ秒）
   * @returns Promise
   */
  sleep: (ms: number) => Promise<void>;
};

/**
 * ブラウザ標準の実装
 */
export const createBrowserTimeProvider = (): TimeProvider => {
  return {
    now: () => Date.now(),

    getDate: () => new Date(),

    setTimeout: (callback: () => void, delay: number) => {
      return window.setTimeout(callback, delay) as unknown as number;
    },

    clearTimeout: (id: number) => {
      window.clearTimeout(id);
    },

    setInterval: (callback: () => void, interval: number) => {
      return window.setInterval(callback, interval) as unknown as number;
    },

    clearInterval: (id: number) => {
      window.clearInterval(id);
    },

    sleep: (ms: number) => {
      return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });
    },
  };
};

/**
 * テスト用のモック実装
 */
export const createMockTimeProvider = (
  initialTime = 0,
): TimeProvider & {
  advance: (ms: number) => void;
  runAllTimers: () => void;
  runOnlyPendingTimers: () => void;
  getTimerCount: () => number;
} => {
  let currentTime = initialTime;
  let nextTimerId = 1;

  type Timer = {
    id: number;
    callback: () => void;
    time: number;
    interval?: number;
  };

  const timers = new Map<number, Timer>();

  const executeDueTimers = () => {
    const dueTimers = Array.from(timers.values())
      .filter((timer) => timer.time <= currentTime)
      .sort((a, b) => a.time - b.time);

    for (const timer of dueTimers) {
      if (timer.interval !== undefined) {
        // インターバルタイマーの場合は再スケジュール
        timer.time = currentTime + timer.interval;
      } else {
        // タイムアウトタイマーの場合は削除
        timers.delete(timer.id);
      }
      timer.callback();
    }
  };

  return {
    now: () => currentTime,

    getDate: () => new Date(currentTime),

    setTimeout: (callback: () => void, delay: number) => {
      const id = nextTimerId++;
      timers.set(id, {
        id,
        callback,
        time: currentTime + delay,
      });
      return id;
    },

    clearTimeout: (id: number) => {
      timers.delete(id);
    },

    setInterval: (callback: () => void, interval: number) => {
      const id = nextTimerId++;
      timers.set(id, {
        id,
        callback,
        time: currentTime + interval,
        interval,
      });
      return id;
    },

    clearInterval: (id: number) => {
      timers.delete(id);
    },

    sleep: (ms: number) => {
      return new Promise<void>((resolve) => {
        const id = nextTimerId++;
        timers.set(id, {
          id,
          callback: resolve,
          time: currentTime + ms,
        });
      });
    },

    // テスト用のヘルパーメソッド
    advance: (ms: number) => {
      currentTime += ms;
      executeDueTimers();
    },

    runAllTimers: () => {
      while (timers.size > 0) {
        const nextTimer = Array.from(timers.values()).sort(
          (a, b) => a.time - b.time,
        )[0];

        if (nextTimer) {
          currentTime = nextTimer.time;
          executeDueTimers();
        }
      }
    },

    runOnlyPendingTimers: () => {
      const targetTime = currentTime;
      const pendingTimers = Array.from(timers.values()).filter(
        (timer) => timer.time <= targetTime,
      );

      for (const timer of pendingTimers) {
        currentTime = timer.time;
        executeDueTimers();
      }
    },

    getTimerCount: () => timers.size,
  };
};
