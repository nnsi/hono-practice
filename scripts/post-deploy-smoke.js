#!/usr/bin/env node

const sleep = (delayMs) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

export async function smokeEndpoint(
  name,
  url,
  fetchImpl = fetch,
  {
    maxAttempts = 5,
    retryDelayMs = 3_000,
    sleepImpl = sleep,
  } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { "User-Agent": "actiko-release-smoke/1" },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return { name, status: response.status };
      lastError = new Error(
        `${name} smoke failed with HTTP ${response.status}`,
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await sleepImpl(retryDelayMs * attempt);
    }
  }

  throw lastError;
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
