export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export type Logger = {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
};

type LoggerOptions = {
  level?: LogLevel;
  bindings?: Record<string, unknown>;
};

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const minLevel = LOG_LEVEL_PRIORITY[options.level ?? "debug"];
  const bindings = options.bindings ?? {};

  const write = (
    level: LogLevel,
    msg: string,
    data?: Record<string, unknown>,
  ) => {
    if (LOG_LEVEL_PRIORITY[level] < minLevel) return;

    const entry = {
      level,
      msg,
      ...bindings,
      ...data,
      timestamp: new Date().toISOString(),
    };

    const fn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    fn(JSON.stringify(entry));
  };

  return {
    debug: (msg, data) => write("debug", msg, data),
    info: (msg, data) => write("info", msg, data),
    warn: (msg, data) => write("warn", msg, data),
    error: (msg, data) => write("error", msg, data),
    child: (childBindings) =>
      createLogger({
        level: options.level,
        bindings: { ...bindings, ...childBindings },
      }),
  };
};
