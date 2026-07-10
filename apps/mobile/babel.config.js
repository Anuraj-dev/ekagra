module.exports = (api) => {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 uses the Worklets Babel plugin; it must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
