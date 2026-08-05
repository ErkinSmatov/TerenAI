/* eslint-disable @typescript-eslint/no-require-imports */
// getSentryExpoConfig — замена getDefaultConfig из expo/metro-config: та же
// сигнатура, но дополнительно генерирует sourcemaps для загрузки в Sentry.
// Без неё стек-трейсы релиза остались бы адресами Hermes-байткода.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

module.exports = config;
