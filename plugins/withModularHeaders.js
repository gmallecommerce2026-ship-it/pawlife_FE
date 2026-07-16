const { withPodfile } = require('@expo/config-plugins');

module.exports = function withModularHeaders(config) {
  return withPodfile(config, (config) => {
    if (!config.modResults.contents.includes('use_modular_headers!')) {
      config.modResults.contents = config.modResults.contents.replace(
        /platform :ios.*\n/,
        (match) => `${match}use_modular_headers!\n`
      );
    }
    return config;
  });
};