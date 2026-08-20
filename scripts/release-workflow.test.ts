import fs from "node:fs";

import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const githubExpression = (value: string) => `$${`{{ ${value} }}`}`;
const mobileBundleStep = workflow.match(
  / {6}- name: Generate iOS and Android release bundles[\s\S]*?(?=\n {6}- name:)/,
)?.[0];

describe("release workflow guards", () => {
  it("uses the tested artifact impact classifier", () => {
    expect(workflow).toContain("node scripts/release-impact.js");
    expect(workflow).toContain("steps.impact.outputs.backend");
    expect(workflow).toContain("steps.impact.outputs.frontend");
    expect(workflow).toContain("steps.impact.outputs.admin");
    expect(workflow).toContain("steps.impact.outputs.tail");
    expect(workflow).not.toContain("steps.changed_backend.outputs.any_changed");
  });

  it("gates release deployment with CI, Web E2E, Tail build, and smoke checks", () => {
    expect(workflow).toContain("pnpm run ci-check");
    expect(workflow).toContain("pnpm run test-e2e");
    expect(workflow).toContain("Build Tail Worker artifact");
    expect(workflow).toContain("Deploy Tail Worker (release)");
    expect(workflow).toContain("Post-deploy smoke (production)");
  });

  it("installs the lockfile-matched Chromium before the release E2E gate", () => {
    const installBrowser = workflow.indexOf(
      "pnpm exec playwright install --with-deps chromium",
    );
    const runE2E = workflow.indexOf("pnpm run test-e2e");

    expect(installBrowser).toBeGreaterThan(-1);
    expect(installBrowser).toBeLessThan(runE2E);
  });

  it("requires an approved SHA and rejects native changes for OTA", () => {
    expect(workflow).toContain("mobile_release_sha:");
    expect(workflow).toContain('GITHUB_REF" != "refs/heads/release');
    expect(workflow).toContain("mobile_native_base_sha");
    expect(workflow).toContain("--assert-ota-safe");
  });

  it("runs repository checks and both platform bundle exports before mobile release", () => {
    expect(workflow).toContain("Run repository CI gate");
    expect(mobileBundleStep).toContain("working-directory: .");
    expect(mobileBundleStep).toContain("rm -rf dist-release-bundles");
    expect(mobileBundleStep).toContain(
      "pnpm --filter actiko-mobile run export:release:ios",
    );
    expect(mobileBundleStep).toContain(
      "pnpm --filter actiko-mobile run export:release:android",
    );
    expect(mobileBundleStep).toContain("test -d dist-release-bundles/ios");
    expect(mobileBundleStep).toContain("test -d dist-release-bundles/android");
  });

  it("preflights and binds the rate-limit KV namespace for both environments", () => {
    expect(workflow).toContain(
      `KV_RATE_LIMIT_ID: ${githubExpression("secrets.KV_RATE_LIMIT_ID_STG")}`,
    );
    expect(workflow).toContain(
      `KV_RATE_LIMIT_ID: ${githubExpression("secrets.KV_RATE_LIMIT_ID_PROD")}`,
    );
    expect(
      workflow.match(/check-required-env\.js[^\n]*\bKV_RATE_LIMIT_ID\b/g),
    ).toHaveLength(2);
    expect(workflow.match(/binding = "RATE_LIMIT_KV_NS"/g)).toHaveLength(2);
    expect(
      workflow.match(/\[\[env\.(?:stg|production)\.kv_namespaces\]\]/g),
    ).toHaveLength(2);
  });

  it("runs the lockfile-pinned EAS CLI without a global install", () => {
    expect(workflow).toContain("pnpm exec eas build");
    expect(workflow).toContain("pnpm exec eas update");
    expect(workflow).not.toContain("npm install -g eas-cli");
  });

  it("preflights names without shell tracing or printing secret values", () => {
    expect(workflow).toContain("check-required-env.js");
    expect(workflow).not.toMatch(/set\s+-x/);
    expect(workflow).not.toMatch(/echo[^\n]*\$\{\{\s*secrets\./);
  });

  it("passes workflow-dispatch strings through environment variables", () => {
    expect(workflow).toContain(
      `MOBILE_MESSAGE: ${githubExpression("github.event.inputs.mobile_message")}`,
    );
    expect(workflow).toContain(
      `MOBILE_PLATFORM: ${githubExpression("github.event.inputs.mobile_platform")}`,
    );
    expect(workflow).toContain('MESSAGE="$MOBILE_MESSAGE"');
    expect(workflow).toContain('--platform "$MOBILE_PLATFORM"');
    expect(workflow).not.toContain('MESSAGE="${{ github.event.inputs');
    expect(workflow).not.toContain(
      `--platform ${githubExpression("github.event.inputs.mobile_platform")}`,
    );
    expect(workflow).not.toContain(
      `if [ "${githubExpression("github.event.inputs.mobile_platform")}"`,
    );
  });

  it("configures the admin frontend origin as a backend secret", () => {
    expect(workflow).toContain("wrangler secret put ADMIN_APP_URL --env stg");
    expect(workflow).toContain(
      "wrangler secret put ADMIN_APP_URL --env production",
    );
    expect(workflow).toContain(
      `ADMIN_APP_URL: ${githubExpression("secrets.ADMIN_APP_URL_STG")}`,
    );
    expect(workflow).toContain(
      `ADMIN_APP_URL: ${githubExpression("secrets.ADMIN_APP_URL_PROD")}`,
    );
  });
});
