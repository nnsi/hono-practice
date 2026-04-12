/**
 * apps/backend/api/v1 の route tree と endpointMetadata を突き合わせ、
 * apps/frontend/src/components/api-reference/apiReferenceData.generated.ts を生成する。
 *
 * 未登録エンドポイント・スコープ未解決は fail させる (CI で drift を検出)。
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  ENDPOINT_GROUP_METADATA,
  ENDPOINT_METADATA,
  type EndpointGroupMeta,
  type EndpointMeta,
} from "../apps/backend/api/v1/endpointMetadata.ts";
import { createApiV1Route } from "../apps/backend/api/v1/index.ts";
import { resolveScopeForPath } from "../apps/backend/api/v1/scopeMapping.ts";
import {
  type Endpoint,
  type EndpointGroup,
  render,
} from "./generate-api-reference/render.ts";
import { schemaToParams } from "./generate-api-reference/zodWalker.ts";

function findGroup(path: string): EndpointGroupMeta | undefined {
  return ENDPOINT_GROUP_METADATA.find(
    (g) => path === g.pathPrefix || path.startsWith(`${g.pathPrefix}/`),
  );
}

function collectEndpoints(): EndpointGroup[] {
  const seen = new Set<string>();
  const raw = createApiV1Route()
    .routes.filter((r) => r.method !== "ALL")
    .filter((r) => {
      const key = `${r.method} ${r.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const groups = new Map<string, EndpointGroup>();
  for (const g of ENDPOINT_GROUP_METADATA) {
    groups.set(g.id, {
      id: g.id,
      title: g.title,
      description: g.description,
      endpoints: [],
    });
  }

  const missing: string[] = [];
  const missingScopes: string[] = [];

  for (const r of raw) {
    const key = `${r.method} ${r.path}`;
    const meta: EndpointMeta | undefined = ENDPOINT_METADATA[key];
    if (!meta) {
      missing.push(key);
      continue;
    }
    const group = findGroup(r.path);
    if (!group) {
      throw new Error(
        `Route ${key} does not belong to any ENDPOINT_GROUP_METADATA prefix`,
      );
    }
    const scope = resolveScopeForPath(r.method, r.path);
    if (!scope) {
      missingScopes.push(key);
      continue;
    }

    const queryParams = schemaToParams(meta.queryParamsSchema);
    const requestBody = schemaToParams(meta.requestSchema);

    const endpoint: Endpoint = {
      method: r.method,
      path: r.path,
      description: meta.description,
      scope,
      queryParams,
      requestBody,
    };

    groups.get(group.id)?.endpoints.push(endpoint);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing endpoint metadata for:\n${missing.map((m) => `  - ${m}`).join("\n")}\n\nAdd entries to apps/backend/api/v1/endpointMetadata.ts`,
    );
  }
  if (missingScopes.length > 0) {
    throw new Error(
      `No scope resolved for:\n${missingScopes.map((m) => `  - ${m}`).join("\n")}\n\nAdd entries to apps/backend/api/v1/scopeMapping.ts`,
    );
  }

  return ENDPOINT_GROUP_METADATA.map(
    (g) => groups.get(g.id) as EndpointGroup,
  ).filter((g) => g.endpoints.length > 0);
}

function main() {
  const groups = collectEndpoints();
  const output = render(groups);
  const outputPath = join(
    process.cwd(),
    "apps",
    "frontend",
    "src",
    "components",
    "api-reference",
    "apiReferenceData.generated.ts",
  );
  writeFileSync(outputPath, output);
  const count = groups.reduce((sum, g) => sum + g.endpoints.length, 0);
  console.log(
    `Generated ${outputPath} (${groups.length} groups, ${count} endpoints)`,
  );
}

main();
