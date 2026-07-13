#!/usr/bin/env node

export async function smokeEndpoint(name, url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    headers: { "User-Agent": "actiko-release-smoke/1" },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${name} smoke failed with HTTP ${response.status}`);
  return { name, status: response.status };
}

function parseEndpoints(args) {
  return args.map((value) => {
    const separator = value.indexOf("=");
    if (separator <= 0) throw new Error(`Expected name=url, received: ${value}`);
    return { name: value.slice(0, separator), url: value.slice(separator + 1) };
  });
}

if (process.argv[1]?.endsWith("post-deploy-smoke.js")) {
  const endpoints = parseEndpoints(process.argv.slice(2));
  if (endpoints.length === 0) throw new Error("At least one smoke endpoint is required");
  for (const endpoint of endpoints) {
    const result = await smokeEndpoint(endpoint.name, endpoint.url);
    console.log(`${result.name}: HTTP ${result.status}`);
  }
}
