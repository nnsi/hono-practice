const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// モノレポの設定
config.watchFolders = [
  projectRoot,
  path.resolve(monorepoRoot, 'packages'),
  path.resolve(monorepoRoot, 'apps/backend'),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// パッケージエイリアスの解決
config.resolver.extraNodeModules = {
  '@packages/auth-core': path.resolve(monorepoRoot, 'packages/auth-core'),
  '@backend': path.resolve(monorepoRoot, 'apps/backend'),
};

// Webサポートの設定
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// 除外設定
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  // db-dataディレクトリを完全に除外
  /.*\/db-data\/.*/,
  /\/\.git\/.*/,
  /.*\.log$/,
  // node_modulesの重複を避ける
  new RegExp(`${monorepoRoot.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}/apps/(?!mobile)[^/]+/node_modules/.*`),
]);

module.exports = withNativeWind(config, { input: './global.css' });