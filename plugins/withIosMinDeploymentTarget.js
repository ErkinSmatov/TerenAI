// @ts-nocheck
const { withPodfile } = require("@expo/config-plugins");

const MARKER = "# @generated withIosMinDeploymentTarget";

// react-native-nitro-modules (используется @kingstinct/react-native-healthkit)
// объявляет в своём podspec deployment target на уровне минимальной версии
// React Native, а не Podfile'а — expo-build-properties и `platform :ios, X`
// в Podfile его не перебивают. Библиотеке нужен iOS 16+ (C++ interop),
// поэтому форсируем минимальную версию во всех pod-таргетах напрямую.
function withIosMinDeploymentTarget(config, { deploymentTarget }) {
  return withPodfile(config, (config) => {
    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }

    const postInstallMarker = "post_install do |installer|";
    const snippet = `${postInstallMarker}
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        current = build_configuration.build_settings["IPHONEOS_DEPLOYMENT_TARGET"].to_f
        if current < ${deploymentTarget}.to_f
          build_configuration.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "${deploymentTarget}"
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

module.exports = withIosMinDeploymentTarget;
