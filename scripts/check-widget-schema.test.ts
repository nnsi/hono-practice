import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = resolve("scripts/check-widget-schema.js");
const migrationsPath = "apps/mobile/src/db/migrations.ts";
const swiftPath = "apps/mobile/targets/widget/WidgetDbHelper.swift";
const kotlinDirectory =
  "apps/mobile/modules/timer-widget/android/src/main/java/com/actiko/widget";
const kotlinPath = `${kotlinDirectory}/WidgetDbHelper.kt`;
const fixtureFiles = [
  migrationsPath,
  "apps/mobile/src/db/migrationSqlV1.ts",
  "apps/mobile/src/db/migrationSql.ts",
  swiftPath,
  "apps/mobile/targets/widget/WidgetActivityQueries.swift",
  "apps/mobile/targets/widget/WidgetActivityLogWriter.swift",
  "apps/mobile/targets/widget/WidgetDbQueries.swift",
  kotlinPath,
  `${kotlinDirectory}/WidgetDbActivityQueries.kt`,
  `${kotlinDirectory}/WidgetDbLogWriter.kt`,
  `${kotlinDirectory}/WidgetLogHelper.kt`,
];

let fixtureDirectory: string;
beforeEach(() => {
  fixtureDirectory = mkdtempSync(join(tmpdir(), "widget-schema-guard-"));
  for (const path of fixtureFiles) {
    const target = join(fixtureDirectory, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(path), target);
  }
});
afterEach(() => rmSync(fixtureDirectory, { recursive: true, force: true }));

function editFixture(path: string, transform: (source: string) => string) {
  const target = join(fixtureDirectory, path);
  const source = readFileSync(target, "utf8");
  const changed = transform(source);
  expect(changed).not.toBe(source);
  writeFileSync(target, changed, "utf8");
}

function runGuard() {
  const result = spawnSync(process.execPath, [script], {
    cwd: fixtureDirectory,
    encoding: "utf8",
  });
  expect(result.error).toBeUndefined();
  return { status: result.status, output: result.stdout + result.stderr };
}

describe("widget schema compatibility guard", () => {
  it("allows the existing v12 widgets on the additive v13 schema", () => {
    const result = runGuard();
    expect(result.status).toBe(0);
    expect(result.output).toContain("compatible widget versions 12..13");
  });

  it("allows a native version at the current schema boundary", () => {
    editFixture(swiftPath, (source) =>
      source.replace(
        "supportedSchemaVersion = 12",
        "supportedSchemaVersion = 13",
      ),
    );
    expect(runGuard().status).toBe(0);
  });

  it("rejects a native widget below the compatibility minimum", () => {
    editFixture(swiftPath, (source) =>
      source.replace(
        "supportedSchemaVersion = 12",
        "supportedSchemaVersion = 11",
      ),
    );
    const result = runGuard();
    expect(result.status).toBe(1);
    expect(result.output).toContain("iOS Widget");
    expect(result.output).toContain("declares 11; supported range is 12..13");
  });

  it("rejects a native widget newer than the database schema", () => {
    editFixture(kotlinPath, (source) =>
      source.replace(
        "SUPPORTED_SCHEMA_VERSION = 12",
        "SUPPORTED_SCHEMA_VERSION = 14",
      ),
    );
    const result = runGuard();
    expect(result.status).toBe(1);
    expect(result.output).toContain("Android Widget");
    expect(result.output).toContain("declares 14; supported range is 12..13");
  });

  it.each([
    "0",
    "14",
    "-1",
    "unknownVersion",
    "12 + 0",
  ])("rejects an invalid or unevaluable compatibility minimum: %s", (minimum) => {
    editFixture(migrationsPath, (source) =>
      source.replace(
        "MINIMUM_WIDGET_SCHEMA_VERSION = 12;",
        `MINIMUM_WIDGET_SCHEMA_VERSION = ${minimum};`,
      ),
    );
    expect(runGuard().status).toBe(1);
  });

  it("requires an explicitly declared compatibility minimum", () => {
    editFixture(migrationsPath, (source) =>
      source.replace("export const MINIMUM_WIDGET_SCHEMA_VERSION = 12;", ""),
    );
    const result = runGuard();
    expect(result.status).toBe(1);
    expect(result.output).toContain(
      "MINIMUM_WIDGET_SCHEMA_VERSION constant not found",
    );
  });

  it("rejects a future DB version until widget compatibility is reviewed again", () => {
    editFixture(migrationsPath, (source) =>
      source.replace(
        "export const SCHEMA_VERSION = 13;",
        "export const SCHEMA_VERSION = 14;",
      ),
    );
    editFixture(
      "apps/mobile/src/db/migrationSql.ts",
      (source) =>
        `${source}\nexport const MIGRATION_V14 = \`DROP TABLE activities;\`;\n`,
    );
    const result = runGuard();
    expect(result.status).toBe(1);
    expect(result.output).toContain(
      "compatibility review required: reviewed=13, current=14",
    );
  });

  it.each([
    "0",
    "-1",
    "12",
    "14",
    "unknownVersion",
    "13 + 0",
    "SCHEMA_VERSION",
    "9007199254740992",
  ])("rejects an invalid or unevaluable reviewed version: %s", (reviewed) => {
    editFixture(migrationsPath, (source) =>
      source.replace(
        "WIDGET_SCHEMA_COMPATIBILITY_REVIEWED_VERSION = 13;",
        `WIDGET_SCHEMA_COMPATIBILITY_REVIEWED_VERSION = ${reviewed};`,
      ),
    );
    expect(runGuard().status).toBe(1);
  });

  it("requires an explicitly declared reviewed version", () => {
    editFixture(migrationsPath, (source) =>
      source.replace(
        "export const WIDGET_SCHEMA_COMPATIBILITY_REVIEWED_VERSION = 13;",
        "",
      ),
    );
    const result = runGuard();
    expect(result.status).toBe(1);
    expect(result.output).toContain(
      "WIDGET_SCHEMA_COMPATIBILITY_REVIEWED_VERSION constant not found",
    );
  });

  it("rejects missing or unknown native version declarations", () => {
    editFixture(kotlinPath, (source) =>
      source.replace(
        "SUPPORTED_SCHEMA_VERSION = 12",
        "SUPPORTED_SCHEMA_VERSION = unknownVersion",
      ),
    );
    const result = runGuard();
    expect(result.status).toBe(1);
    expect(result.output).toContain(
      "Android Widget schema version constant not found",
    );
  });

  it("still rejects phantom SQL columns when native versions are compatible", () => {
    editFixture(
      swiftPath,
      (source) =>
        `${source}\nlet query = "SELECT phantom_widget_column FROM activities"\n`,
    );
    const result = runGuard();
    expect(result.status).toBe(1);
    expect(result.output).toContain(
      'column "activities.phantom_widget_column" not found',
    );
  });
});
