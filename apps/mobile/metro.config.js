const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// モノレポの設定
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Webサポートの設定
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// 除外設定
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  /\/db-data\/.*/,
  /\/\.git\/.*/,
  /.*\.log$/,
]);

module.exports = config;