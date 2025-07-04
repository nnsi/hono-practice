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
  '@packages/frontend-shared': path.resolve(monorepoRoot, 'packages/frontend-shared'),
  '@backend': path.resolve(monorepoRoot, 'apps/backend'),
  '@dtos': path.resolve(monorepoRoot, 'packages/types'),
};

// Webサポートの設定
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// 除外設定
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  // db-dataディレクトリを完全に除外
  /.*\/db-data\/.*/,
  /.*\/db-data$/,
  /^db-data\/.*/,
  /\/\.git\/.*/,
  /.*\.log$/,
  // node_modulesの重複を避ける
  new RegExp(`${monorepoRoot.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}/apps/(?!mobile)[^/]+/node_modules/.*`),
]);

// watchFoldersから除外するディレクトリの設定
config.watchFolders = config.watchFolders.filter(folder => !folder.includes('db-data'));

// ファイルウォッチャーの設定
config.watcher = {
  // watchman を使用する設定を追加
  watchman: {
    // db-dataを除外
    ignore: [
      '**/db-data/**',
      '**/db-data',
      'db-data/**',
    ]
  },
  // healthCheck のタイムアウトを延長
  healthCheck: {
    interval: 5000,
    timeout: 30000,
    filePrefix: '.metro-health-check'
  }
};

// resetCacheを有効化
config.resetCache = true;

module.exports = withNativeWind(config, { input: './global.css' });