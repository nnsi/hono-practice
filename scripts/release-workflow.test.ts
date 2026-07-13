import fs from "node:fs";

import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const githubExpression = (value: string) => `$${`{{ ${value} }}`}`;

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

  it("requires an approved SHA and rejects native changes for OTA", () => {
    expect(workflow).toContain("mobile_release_sha:");
    expect(workflow).toContain('GITHUB_REF" != "refs/heads/release');
    expect(workflow).toContain("mobile_native_base_sha");
    expect(workflow).toContain("--assert-ota-safe");
  });

  it("runs repository checks and both platform bundle exports before mobile release", () => {
    expect(workflow).toContain("Run repository CI gate");
    expect(workflow).toContain("expo export --platform ios");
    expect(workflow).toContain("expo export --platform android");
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
