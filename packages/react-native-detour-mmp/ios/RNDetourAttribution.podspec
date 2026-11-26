require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'RNDetourAttribution'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/software-mansion-labs/react-native-detour.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'StoreKit', 'AdServices', 'AdSupport', 'AppTrackingTransparency'
  # Weak, so an app that supports iOS before 17.4 still launches there without the framework.
  s.weak_frameworks = 'AdAttributionKit'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.source_files = '*.swift'
  s.resource_bundles = { 'RNDetourAttribution_privacy' => ['PrivacyInfo.xcprivacy'] }
end
