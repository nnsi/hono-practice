import fs from "node:fs";

import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const publishJob = workflow.match(/ {2}publish:[\s\S]*/)?.[0];
const githubExpression = (value: string) => `$${`{{ ${value} }}`}`;

const step = (name: string) =>
  publishJob?.split(`      - name: ${name}\n`)[1]?.split("\n      - name:")[0];

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

  it("has no manual mobile release path (mobile builds and OTA run locally)", () => {
    expect(workflow).not.toContain("workflow_dispatch");
    expect(workflow).not.toContain("mobile-release:");
    expect(workflow).not.toContain("eas build");
    expect(workflow).not.toContain("eas update");
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

  it("preflights names without shell tracing or printing secret values", () => {
    expect(workflow).toContain("check-required-env.js");
    expect(workflow).not.toMatch(/set\s+-x/);
    expect(workflow).not.toMatch(/echo[^\n]*\$\{\{\s*secrets\./);
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
