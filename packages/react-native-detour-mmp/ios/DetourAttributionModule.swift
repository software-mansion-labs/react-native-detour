import AdServices
import ExpoModulesCore
import StoreKit
#if canImport(AdAttributionKit)
// Weak, so an app that supports iOS before 17.4 still launches there without the framework.
@_weakLinked import AdAttributionKit
#endif

enum CoarseValue: String, Enumerable {
  case low
  case medium
  case high
}

/// Calls the Apple attribution APIs. Every decision on what to send lives in JS.
public class DetourAttributionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DetourAttribution")

    AsyncFunction("register") {
      if #available(iOS 15.4, *) {
        try await Self.update(fine: 0, coarse: nil, lock: false)
      } else {
        SKAdNetwork.registerAppForAdNetworkAttribution()
      }
    }

    AsyncFunction("updateConversionValue") { (fine: Int, coarse: CoarseValue?, lock: Bool) in
      try await Self.update(fine: fine, coarse: coarse, lock: lock)
    }

    AsyncFunction("attributionToken") { () -> String in
      try AAAttribution.attributionToken()
    }

    // The Info.plist keys that tell Apple where to send copies of winning postbacks: SKAdNetwork, then AdAttributionKit.
    Function("missingPostbackCopyKeys") { () -> [String] in
      ["NSAdvertisingAttributionReportEndpoint", "AttributionCopyEndpoint"].filter {
        ((Bundle.main.object(forInfoDictionaryKey: $0) as? String) ?? "").isEmpty
      }
    }
  }

  /// Throws when SKAdNetwork refuses the value. AdAttributionKit only follows it, so its error is logged.
  private static func update(fine: Int, coarse: CoarseValue?, lock: Bool) async throws {
    var skAdNetworkError: Error?
    do {
      if #available(iOS 16.1, *), let coarse {
        try await SKAdNetwork.updatePostbackConversionValue(fine, coarseValue: coarse.skAdNetwork, lockWindow: lock)
      } else if #available(iOS 15.4, *) {
        try await SKAdNetwork.updatePostbackConversionValue(fine)
      } else {
        SKAdNetwork.updateConversionValue(fine)
      }
    } catch {
      skAdNetworkError = error
    }

    #if canImport(AdAttributionKit)
    if #available(iOS 17.4, *) {
      do {
        if let coarse {
          try await Postback.updateConversionValue(fine, coarseConversionValue: coarse.adAttributionKit, lockPostback: lock)
        } else {
          try await Postback.updateConversionValue(fine, lockPostback: lock)
        }
      } catch {
        NSLog("[Detour:ATTRIBUTION] AdAttributionKit update failed: %@", error.localizedDescription)
      }
    }
    #endif

    if let skAdNetworkError { throw skAdNetworkError }
  }
}

extension CoarseValue {
  @available(iOS 16.1, *)
  var skAdNetwork: SKAdNetwork.CoarseConversionValue {
    switch self {
    case .low: return .low
    case .medium: return .medium
    case .high: return .high
    }
  }

  #if canImport(AdAttributionKit)
  @available(iOS 17.4, *)
  var adAttributionKit: AdAttributionKit.CoarseConversionValue {
    switch self {
    case .low: return .low
    case .medium: return .medium
    case .high: return .high
    }
  }
  #endif
}
