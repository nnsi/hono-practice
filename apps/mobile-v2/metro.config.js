const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// On web, redirect expo-sqlite to our web shim (native module not available)
// Metro can't resolve hono/client exports map — point it to the dist file directly
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "expo-sqlite") {
    return {
      type: "sourceFile",
      filePath: path.resolve(projectRoot, "src/db/expo-sqlite-web-shim.ts"),
    };
  }
  if (moduleName === "hono/client") {
    return {
      type: "sourceFile",
      filePath: path.resolve(
        monorepoRoot,
        "node_modules/hono/dist/client/index.js",
      ),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
