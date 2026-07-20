const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

config.resolver.unstable_enablePackageExports = true;
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
};

module.exports = config;
