#!/usr/bin/env node
/**
 * Widget schema coupling guard
 *
 * iOS (Swift) and Android (Kotlin) widget files query the shared SQLite DB
 * using raw SQL strings. If a table or column referenced by widget code is
 * renamed/removed in migrationSql*.ts without updating the native files, the
 * widget silently crashes at runtime with no compile-time error.
 *
 * This script:
 *   1. Extracts SQL string literals from Swift / Kotlin widget source files.
 *   2. Parses table names and column names referenced in those SQL literals.
 *   3. Verifies each referenced table/column exists in the migrationSql*.ts
 *      CREATE TABLE / ALTER TABLE definitions.
 *   4. Exits 1 with a descriptive error if any reference is missing.
 *
 * Target native files (derived from migrationSqlV1.ts warning block):
 *   - apps/mobile/targets/widget/WidgetDbHelper.swift
 *   - apps/mobile/targets/widget/WidgetDbQueries.swift
 *   - apps/mobile/modules/timer-widget/android/.../WidgetDbHelper.kt
 *   - apps/mobile/modules/timer-widget/android/.../WidgetLogHelper.kt
 *
 * Usage:
 *   node scripts/check-widget-schema.js           # normal check
 *   node scripts/check-widget-schema.js --self-test  # inject a phantom
 *                                                     # reference and confirm
 *                                                     # detection fires
 */

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Native widget files that reference the shared SQLite schema
// ---------------------------------------------------------------------------
const NATIVE_FILES = [
  "apps/mobile/targets/widget/WidgetDbHelper.swift",
  "apps/mobile/targets/widget/WidgetDbQueries.swift",
  "apps/mobile/modules/timer-widget/android/src/main/java/com/actiko/widget/WidgetDbHelper.kt",
  "apps/mobile/modules/timer-widget/android/src/main/java/com/actiko/widget/WidgetLogHelper.kt",
];

// Migration source files that define the schema
const MIGRATION_FILES = [
  "apps/mobile/src/db/migrationSqlV1.ts",
  "apps/mobile/src/db/migrationSql.ts",
];

// ---------------------------------------------------------------------------
// Schema extraction — parse CREATE TABLE / ALTER TABLE from migration TS files
// ---------------------------------------------------------------------------

/**
 * Returns a Map<tableName, Set<columnName>> from all migration SQL strings.
 * Handles:
 *   - CREATE TABLE IF NOT EXISTS <table> ( <col> TYPE ..., ... )
 *   - ALTER TABLE <table> ADD COLUMN <col>
 */
function extractSchema(migrationFiles) {
  /** @type {Map<string, Set<string>>} */
  const schema = new Map();

  for (const relPath of migrationFiles) {
    const absPath = join(ROOT, relPath);
    let content;
    try {
      content = readFileSync(absPath, "utf8");
    } catch {
      console.error(`check-widget-schema: cannot read migration file: ${relPath}`);
      process.exit(1);
    }

    // Extract all template-literal / backtick SQL strings
    // (Migration files use: export const MIGRATION_Vn = `...`;)
    const sqlBlocks = [];
    const backtickRe = /`([^`]*)`/gs;
    let m;
    while ((m = backtickRe.exec(content)) !== null) {
      sqlBlocks.push(m[1]);
    }
    // Also scan the whole file in case SQL is in regular strings
    sqlBlocks.push(content);

    for (const sql of sqlBlocks) {
      // CREATE TABLE IF NOT EXISTS <table> (
      const createRe =
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([^;]*?)\)/gis;
      while ((m = createRe.exec(sql)) !== null) {
        const table = m[1].toLowerCase();
        const body = m[2];
        if (!schema.has(table)) schema.set(table, new Set());
        const cols = schema.get(table);
        // Each line that starts with an identifier is a column definition
        // (INDEX, FOREIGN KEY, PRIMARY KEY constraints start differently)
        for (const line of body.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          // Skip table constraints
          if (/^(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|CONSTRAINT)/i.test(trimmed))
            continue;
          const colMatch = trimmed.match(/^(\w+)\s/);
          if (colMatch) cols.add(colMatch[1].toLowerCase());
        }
      }

      // ALTER TABLE <table> ADD COLUMN <col>
      const alterRe =
        /ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?:COLUMN\s+)?(\w+)/gis;
      while ((m = alterRe.exec(sql)) !== null) {
        const table = m[1].toLowerCase();
        const col = m[2].toLowerCase();
        if (!schema.has(table)) schema.set(table, new Set());
        schema.get(table).add(col);
      }
    }
  }

  return schema;
}

// ---------------------------------------------------------------------------
// SQL reference extraction — find table/column refs in native widget files
// ---------------------------------------------------------------------------

/**
 * Extract SQL string literal content from a Swift or Kotlin source file.
 *
 * Swift:  - Multi-line string literals:  """..."""
 *         - Single-line string literals:  "..."
 * Kotlin: - Multi-line string literals:  """..."""
 *         - Single-line string literals:  "..."
 *         - rawQuery("...", ...) / execSQL("...")
 *
 * We deliberately restrict extraction to string literals to avoid
 * false-positives from Swift/Kotlin variable names that happen to spell
 * out SQL keywords.
 */
function extractSqlFromNativeFile(absPath) {
  const content = readFileSync(absPath, "utf8");
  const lines = content.split("\n");
  const sqlFragments = []; // { sql, startLine }

  // 1. Triple-quoted multi-line strings (Swift and Kotlin)
  const tripleRe = /"""([\s\S]*?)"""/g;
  let m;
  while ((m = tripleRe.exec(content)) !== null) {
    const lineNo =
      content.slice(0, m.index).split("\n").length;
    sqlFragments.push({ sql: m[1], startLine: lineNo });
  }

  // 2. Single-line double-quoted strings that look like SQL
  //    (contain FROM, SELECT, INSERT, UPDATE, DELETE, WHERE as whole words)
  const singleLineRe = /"([^"\n\\]*(?:\\.[^"\n\\]*)*)"/g;
  while ((m = singleLineRe.exec(content)) !== null) {
    const fragment = m[1];
    if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|INTO|VALUES|SET)\b/i.test(fragment)) {
      const lineNo = content.slice(0, m.index).split("\n").length;
      sqlFragments.push({ sql: fragment, startLine: lineNo });
    }
  }

  // 3. ContentValues().apply { put("column", ...) } — Kotlin only
  //    Captures put("column_name", ...) and putNull("column_name")
  const putRe = /put(?:Null)?\s*\(\s*"(\w+)"/g;
  while ((m = putRe.exec(content)) !== null) {
    const lineNo = content.slice(0, m.index).split("\n").length;
    // Wrap in a fake INSERT so the main parser picks it up
    // We need to know which table the ContentValues is inserted into.
    // Look for db.insert("table_name", ...) in the same block.
    // We store these separately and resolve below.
    sqlFragments.push({
      sql: `/* contentvalues_col */ ${m[1]}`,
      startLine: lineNo,
      isContentValuesCol: true,
      colName: m[1],
    });
  }

  // 4. db.insert("table_name", ...) — Kotlin
  const insertRe = /db\.insert\s*\(\s*"(\w+)"/g;
  while ((m = insertRe.exec(content)) !== null) {
    const lineNo = content.slice(0, m.index).split("\n").length;
    sqlFragments.push({
      sql: `INSERT INTO ${m[1]}`,
      startLine: lineNo,
      isInsertTable: true,
      tableName: m[1],
    });
  }

  return sqlFragments;
}

/**
 * Split a SELECT column list on commas, respecting nested parentheses.
 * e.g. "COALESCE(SUM(quantity), 0), id, name" → 3 tokens
 */
function splitSelectList(colList) {
  const tokens = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < colList.length; i++) {
    const ch = colList[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      tokens.push(colList.slice(start, i));
      start = i + 1;
    }
  }
  tokens.push(colList.slice(start));
  return tokens;
}

/**
 * Parse references (table, column) from extracted SQL fragments.
 * Returns an array of { table, column, file, line } objects.
 * `column` may be null for table-only references.
 *
 * Parsing rules (regex-based, not a full SQL parser):
 *
 *   FROM <table>
 *   INSERT INTO <table>
 *   UPDATE <table>
 *   DELETE FROM <table>
 *   INTO <table> (partial)
 *   SELECT <col>, <col>, ... FROM <table>
 *   WHERE <col> = ...
 *   SET <col> = ...
 *   ORDER BY <col>
 */
function parseRefs(fragments, relPath) {
  const refs = []; // { table, column, file, line }

  // Pass 1: collect all table refs from SQL fragments
  /** @type {Map<number, string>} line → table */
  const tableAtLine = new Map();
  const insertTables = new Set();

  for (const frag of fragments) {
    if (frag.isInsertTable) {
      insertTables.add(frag.tableName.toLowerCase());
      tableAtLine.set(frag.startLine, frag.tableName.toLowerCase());
      refs.push({ table: frag.tableName.toLowerCase(), column: null, file: relPath, line: frag.startLine });
      continue;
    }
    if (frag.isContentValuesCol) continue; // handled in pass 2

    const sql = frag.sql;

    // Extract table names
    const tablePatterns = [
      /FROM\s+(\w+)/gi,
      /INSERT\s+INTO\s+(\w+)/gi,
      /UPDATE\s+(\w+)\s+SET/gi,
      /DELETE\s+FROM\s+(\w+)/gi,
      /INTO\s+(\w+)\s*\(/gi,
    ];
    for (const re of tablePatterns) {
      let m;
      while ((m = re.exec(sql)) !== null) {
        const table = m[1].toLowerCase();
        // Skip SQL keywords that can appear after FROM etc.
        if (/^(select|where|and|or|null|not|is|like|in|exists)$/i.test(table)) continue;
        refs.push({ table, column: null, file: relPath, line: frag.startLine });
        tableAtLine.set(frag.startLine, table);
      }
    }

    // Extract column names from SELECT list
    // "SELECT col1, col2, col3 FROM table"
    const selectMatch = /SELECT\s+([\s\S]*?)\s+FROM\s+\w+/i.exec(sql);
    if (selectMatch) {
      // Determine table for this SELECT
      const fromMatch = /FROM\s+(\w+)/i.exec(sql);
      const table = fromMatch ? fromMatch[1].toLowerCase() : null;
      if (table) {
        const colList = selectMatch[1];
        // Split on comma, strip functions / aliases.
        // Use balanced-paren-aware splitting so COALESCE(SUM(x), 0) is
        // treated as one token, not split in the middle.
        const tokens = splitSelectList(colList);
        for (const rawCol of tokens) {
          // Strip everything inside parens (handles nested functions)
          const stripped = rawCol
            .trim()
            .replace(/\([^()]*\)/g, "") // one level
            .replace(/\([^()]*\)/g, "") // two levels (nested)
            .replace(/\([^()]*\)/g, "") // three levels (extra safety)
            .replace(/\s+AS\s+\w+/gi, "") // strip aliases
            .trim()
            .toLowerCase();
          // Must start with a letter/underscore to be a valid column identifier
          if (!stripped || !/^[a-z_]/.test(stripped)) continue;
          if (/^(count|sum|coalesce|max|min|avg|cast|ifnull|nullif|substr|length|typeof)\b/i.test(stripped)) continue;
          refs.push({ table, column: stripped, file: relPath, line: frag.startLine });
        }
      }
    }

    // Extract columns from WHERE / SET / ORDER BY
    // WHERE col = ? / SET col = ? / ORDER BY col
    const clausePatterns = [
      /WHERE\s+(.*?)(?:\s+AND\s+|\s+OR\s+|$)/gi,
      /SET\s+([\w_]+)\s*=/gi,
      /ORDER\s+BY\s+([\w_]+)/gi,
    ];
    for (const re of clausePatterns) {
      let m;
      while ((m = re.exec(sql)) !== null) {
        // For WHERE: parse "col = ?" and "col IS NULL" etc.
        const clause = m[1];
        const fromMatch = /FROM\s+(\w+)/i.exec(sql) || /UPDATE\s+(\w+)/i.exec(sql);
        if (!fromMatch) continue;
        const table = fromMatch[1].toLowerCase();
        // Grab first identifier which should be the column name
        const colM = clause.match(/^([\w_]+)/);
        if (!colM) continue;
        const col = colM[1].toLowerCase();
        if (/^(select|is|null|not|and|or|true|false|current)$/i.test(col)) continue;
        refs.push({ table, column: col, file: relPath, line: frag.startLine });
      }
    }

    // INSERT INTO table (col1, col2, ...) VALUES (...)
    const insertColsMatch = /INSERT\s+INTO\s+\w+\s*\(([\s\S]*?)\)\s*VALUES/i.exec(sql);
    if (insertColsMatch) {
      const fromMatch = /INSERT\s+INTO\s+(\w+)/i.exec(sql);
      const table = fromMatch ? fromMatch[1].toLowerCase() : null;
      if (table) {
        for (const rawCol of insertColsMatch[1].split(",")) {
          const col = rawCol.trim().toLowerCase();
          if (col) refs.push({ table, column: col, file: relPath, line: frag.startLine });
        }
      }
    }
  }

  // Pass 2: ContentValues columns → associate with the nearest db.insert table
  // We use the first known insertTable since Kotlin files typically insert into
  // one table per class. If multiple tables, we'd need better heuristics.
  for (const frag of fragments) {
    if (!frag.isContentValuesCol) continue;
    // Find closest insert table by line proximity
    let closestTable = null;
    let closestDist = Infinity;
    for (const [line, table] of tableAtLine) {
      const dist = Math.abs(line - frag.startLine);
      if (dist < closestDist) {
        closestDist = dist;
        closestTable = table;
      }
    }
    // Fallback: use any known insert table
    if (!closestTable && insertTables.size > 0) {
      closestTable = [...insertTables][0];
    }
    if (closestTable) {
      refs.push({ table: closestTable, column: frag.colName.toLowerCase(), file: relPath, line: frag.startLine });
    }
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Columns that are SQL keywords or meta values and should not be validated
 * as schema columns even if they appear in an SQL context.
 */
const SKIP_COLS = new Set([
  "null", "true", "false", "current", "pending", "synced", "free",
  "timer", "manual", "counter", "check", "binary",
]);

/**
 * Table names that are SQLite built-in or are fine to skip.
 */
const SKIP_TABLES = new Set([
  "auth_state_where", // would be a parser artifact
]);

function validate(refs, schema) {
  const errors = [];

  for (const ref of refs) {
    const table = ref.table;
    if (SKIP_TABLES.has(table)) continue;

    if (!schema.has(table)) {
      errors.push(
        `  ${ref.file}:${ref.line} — table "${table}" not found in migration schema`,
      );
      continue;
    }

    if (ref.column === null) continue; // table-only ref is fine once table exists
    const col = ref.column;
    if (SKIP_COLS.has(col)) continue;

    const cols = schema.get(table);
    if (!cols.has(col)) {
      errors.push(
        `  ${ref.file}:${ref.line} — column "${table}.${col}" not found in migration schema`,
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Self-test mode
// ---------------------------------------------------------------------------

function runSelfTest(schema) {
  console.log("check-widget-schema: running self-test...");

  // Create a fake reference list that includes a non-existent column
  const fakeRefs = [
    { table: "activities", column: "nonexistent_column_xyz", file: "fake/Test.swift", line: 42 },
    { table: "nonexistent_table_xyz", column: null, file: "fake/Test.kt", line: 10 },
    { table: "activity_logs", column: "id", file: "fake/Test.swift", line: 5 }, // should be OK
  ];

  const errors = validate(fakeRefs, schema);

  const expectedErrors = 2; // nonexistent_column_xyz + nonexistent_table_xyz
  if (errors.length !== expectedErrors) {
    console.error(
      `Self-test FAILED: expected ${expectedErrors} errors, got ${errors.length}`,
    );
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  const hasColError = errors.some((e) => e.includes("nonexistent_column_xyz"));
  const hasTableError = errors.some((e) => e.includes("nonexistent_table_xyz"));
  if (!hasColError || !hasTableError) {
    console.error("Self-test FAILED: did not detect expected phantom references");
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  // Also confirm real refs pass with zero errors
  const allRealRefs = [];
  for (const relPath of NATIVE_FILES) {
    const absPath = join(ROOT, relPath);
    const fragments = extractSqlFromNativeFile(absPath);
    const parsed = parseRefs(fragments, relPath);
    allRealRefs.push(...parsed);
  }
  const realErrors = validate(allRealRefs, schema);
  if (realErrors.length > 0) {
    console.error("Self-test FAILED: real widget files have schema violations:");
    for (const e of realErrors) console.error(e);
    process.exit(1);
  }

  console.log("check-widget-schema: self-test PASSED (phantom detected, real files clean)");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const selfTest = process.argv.includes("--self-test");

const schema = extractSchema(MIGRATION_FILES);

if (selfTest) {
  runSelfTest(schema);
}

const allErrors = [];

for (const relPath of NATIVE_FILES) {
  const absPath = join(ROOT, relPath);
  let fragments;
  try {
    fragments = extractSqlFromNativeFile(absPath);
  } catch {
    console.error(`check-widget-schema: cannot read native file: ${relPath}`);
    process.exit(1);
  }

  const refs = parseRefs(fragments, relPath);
  const errors = validate(refs, schema);
  allErrors.push(...errors);
}

if (allErrors.length > 0) {
  console.error(
    "Widget schema coupling violations detected.\n" +
    "The following tables/columns referenced by native widget code do not exist\n" +
    "in the migrationSql*.ts schema. Update the native WidgetDbHelper files\n" +
    "or restore the schema definitions.\n",
  );
  for (const e of allErrors) {
    console.error(e);
  }
  console.error(
    "\nSee: apps/mobile/src/db/migrationSqlV1.ts (WARNING block at top)",
  );
  process.exit(1);
}

console.log("check-widget-schema: OK — all widget SQL references are present in the migration schema");
