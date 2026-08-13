// @ts-nocheck
const { withPodfile } = require("@expo/config-plugins");

const MARKER = "# @generated withHealthkitSwiftCompileFix";

// swift-frontend (Xcode 16.2, Swift 6.0.3) segfaults compiling the batch of
// tiny nitrogen-generated closure-wrapper files in ReactNativeHealthkit
// (Func_void_*.swift) under C++ interop when they're all passed as
// -primary-file to a single batched invocation. Forcing single-file
// compilation mode for just this pod target avoids the batch-mode crash.
function withHealthkitSwiftCompileFix(config) {
  return withPodfile(config, (config) => {
    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }

    const postInstallMarker = "post_install do |installer|";
    const snippet = `${postInstallMarker}
    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == "ReactNativeHealthkit"
        target.build_configurations.each do |build_configuration|
          build_configuration.build_settings["SWIFT_COMPILATION_MODE"] = "singlefile"
          existing_flags = build_configuration.build_settings["OTHER_SWIFT_FLAGS"] || "$(inherited)"
          build_configuration.build_settings["OTHER_SWIFT_FLAGS"] = "#{existing_flags} -disable-batch-mode"
        end
      end
    end
`;

    config.modResults.contents = config.modResults.contents.replace(
      postInstallMarker,
      snippet
    );

    return config;
  });
}

module.exports = withHealthkitSwiftCompileFix;
