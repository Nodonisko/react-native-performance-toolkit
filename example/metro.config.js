const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const pak = require('../package.json');
const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // Handle subpath import
      if (moduleName === `${pak.name}/reanimated`) {
        return {
          filePath: path.resolve(__dirname, '../src/reanimated.tsx'),
          type: 'sourceFile',
        };
      }
      // Handle main package import
      if (moduleName === pak.name) {
        return {
          filePath: path.resolve(__dirname, '../src/index.tsx'),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);