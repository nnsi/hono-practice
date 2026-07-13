#!/usr/bin/env node

export function missingRequiredEnv(names, env = process.env) {
  return names.filter((name) => !env[name]?.trim());
}

export function formatMissingEnv(names) {
  return names.length === 0
    ? "Required variable names are present"
    : `Missing required variable names: ${names.join(", ")}`;
}

if (process.argv[1]?.endsWith("check-required-env.js")) {
  const names = process.argv.slice(2);
  const missing = missingRequiredEnv(names);
  const message = formatMissingEnv(missing);
  if (missing.length > 0) {
    console.error(message);
    process.exitCode = 1;
  } else {
    console.log(message);
  }
}
