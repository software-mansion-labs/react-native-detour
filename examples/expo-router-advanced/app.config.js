const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Config plugin that patches the generated Podfile to fix fmt compilation
// failures with Apple Clang 21 (Xcode 26+).
//
// The fmt pod uses FMT_STRING which expands to a `consteval` constructor.
// Apple Clang 21 rejects this in C++20 mode — downgrading fmt to c++17
// prevents __cpp_consteval from being defined, so fmt doesn't enable consteval.
//
// This plugin injects the fix into the post_install block so it survives
// every `expo prebuild --clean`.
function withFmtClang21Fix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const fix = `
    # Fix fmt consteval incompatibility with Apple Clang 21 (Xcode 26+).
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end`;

      if (!podfile.includes("target.name == 'fmt'")) {
        // Insert after the closing ')' line of react_native_post_install(...)
        // That line looks like: "    )\n" (4 spaces, closing paren, newline)
        const rnPostInstallIdx = podfile.indexOf('react_native_post_install(');
        const closingParenIdx = podfile.indexOf('\n    )\n', rnPostInstallIdx);
        if (closingParenIdx !== -1) {
          const insertAt = closingParenIdx + '\n    )'.length;
          podfile = podfile.slice(0, insertAt) + '\n' + fix + podfile.slice(insertAt);
          fs.writeFileSync(podfilePath, podfile);
        }
      }

      return cfg;
    },
  ]);
}

const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  plugins: [
    ...appJson.expo.plugins,
    withFmtClang21Fix,
  ],
};
