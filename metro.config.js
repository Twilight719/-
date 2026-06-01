const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add WebP support for character art assets
config.resolver.assetExts = [
  ...config.resolver.assetExts.filter((ext) => ext !== 'webp'),
  'webp',
];

module.exports = config;
