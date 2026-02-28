/**
 * Web shim for expo-sqlite using sql.js (WebAssembly SQLite).
 * Loads sql.js from CDN at runtime to avoid bundling issues with Metro.
 */

// Minimal type for sql.js Database
type SqlJsDatabase = {
  run(sql: string, params?: unknown[]): void;
  prepare(sql: string): {
    bind(params: unknown[]): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  };
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  getRowsModified(): number;
};

type SqlJsStatic = {
  Database: new () => SqlJsDatabase;
};

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sql.js.org/dist/sql-wasm.js";
      script.onload = () => {
        // sql.js sets window.initSqlJs when loaded via script tag
        const initSqlJs = (
          globalThis as unknown as {
            initSqlJs: (config: {
              locateFile: (file: string) => string;
            }) => Promise<SqlJsStatic>;
          }
        ).initSqlJs;
        initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
        }).then(resolve, reject);
      };
      script.onerror = () => reject(new Error("Failed to load sql.js"));
      document.head.appendChild(script);
    });
  }
  return sqlJsPromise;
}

class WebSQLiteDatabase {
  constructor(private db: SqlJsDatabase) {}

  async execAsync(sql: string): Promise<void> {
    this.db.run(sql);
  }

  async getFirstAsync<T>(
    sql: string,
    params?: (string | number | null)[],
  ): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    if (params) stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject() as T;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  async getAllAsync<T>(
    sql: string,
    params?: (string | number | null)[],
  ): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    if (params) stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  async runAsync(
    sql: string,
    params?: (string | number | null)[],
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    if (params) {
      this.db.run(sql, params);
    } else {
      this.db.run(sql);
    }
    const changes = this.db.getRowsModified();
    const lastRow = this.db.exec("SELECT last_insert_rowid() as id");
    const lastInsertRowId =
      lastRow.length > 0 ? (lastRow[0].values[0][0] as number) : 0;
    return { changes, lastInsertRowId };
  }
}

export type SQLiteDatabase = WebSQLiteDatabase;

export async function openDatabaseAsync(
  _name: string,
): Promise<WebSQLiteDatabase> {
  const SQL = await getSqlJs();
  const db = new SQL.Database();
  return new WebSQLiteDatabase(db);
}
