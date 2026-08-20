import fs from "node:fs";

import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const publishJob = workflow.match(
  / {2}publish:[\s\S]*?(?=\n {2}mobile-release:)/,
)?.[0];
const mobileJob = workflow.match(/ {2}mobile-release:[\s\S]*/)?.[0];
const githubExpression = (value: string) => `$${`{{ ${value} }}`}`;

const step = (name: string) =>
  publishJob
    ?.split(`      - name: ${name}\n`)[1]
    ?.split("\n      - name:")[0];

describe("release workflow guards", () => {
  it("deploys every staging and production artifact without path-diff state", () => {
    expect(publishJob).not.toContain("Detect release artifact impact");
    expect(publishJob).not.toContain("steps.impact.outputs");
    expect(publishJob).not.toContain("release-impact.js");

    for (const name of [
      "Build frontend (stg)",
      "Build admin-frontend (stg)",
      "Migrate Neon DB (stg)",
      "Configure Hyperdrive, R2, and KV for staging",
      "Set DATABASE_URL secret in Cloudflare (stg)",
      "Deploy to Cloudflare Workers (stg)",
      "Deploy frontend (stg)",
      "Deploy admin-frontend (stg)",
      "Deploy Tail Worker (stg)",
      "Post-deploy smoke (stg)",
    ]) {
      expect(step(name)).toContain("if: github.ref_name == 'master'");
      expect(step(name)).not.toContain("&&");
    }

    for (const name of [
      "Build frontend (release)",
      "Build admin-frontend (release)",
      "Migrate Neon DB (prod)",
      "Configure Hyperdrive, R2, and KV for production",
      "Set DATABASE_URL secret in Cloudflare (prod)",
      "Deploy to Cloudflare Workers (release)",
      "Deploy frontend (release)",
      "Deploy admin-frontend (release)",
      "Deploy Tail Worker (release)",
      "Post-deploy smoke (production)",
    ]) {
      expect(step(name)).toContain("if: github.ref_name == 'release'");
      expect(step(name)).not.toContain("&&");
    }
  });

  it("does not repeat pull-request quality gates in the deploy workflow", () => {
    expect(publishJob).not.toContain("pnpm run ci-check");
    expect(publishJob).not.toContain("pnpm run test-e2e");
    expect(publishJob).not.toContain("playwright install");
    expect(publishJob).not.toContain("Build Tail Worker artifact");
  });

  it("keeps only release-specific Mobile safety checks", () => {
    expect(workflow).toContain("mobile_release_sha:");
    expect(mobileJob).toContain('GITHUB_REF" != "refs/heads/release');
    expect(workflow).toContain("mobile_native_base_sha");
    expect(mobileJob).toContain("scripts/mobile-ota-safety.js");
    expect(mobileJob).not.toContain("Run repository CI gate");
    expect(mobileJob).not.toContain(
      "Generate iOS and Android release bundles",
    );
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
