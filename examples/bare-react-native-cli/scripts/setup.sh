#!/usr/bin/env bash
#
# Generates the native android/ios projects for this bare React Native CLI example
# and wires in Expo Modules. The native dirs are intentionally NOT committed (see
# .gitignore) because they are large and version-bound — this script regenerates
# them deterministically from the pinned react-native version.
#
# What it does:
#   1. Scaffolds a throwaway RN app with `@react-native-community/cli init`
#      (same app name as ./app.json, so getMainComponentName() matches index.js).
#   2. Copies its android/ + ios/ into this example.
#   3. Runs `install-expo-modules` so the Expo peer deps (expo-application,
#      expo-constants, expo-localization, expo-clipboard) autolink.
#   4. Restores this example's metro.config.js (Expo's installer would replace it
#      with a non-monorepo-aware version).
#
# Prerequisite: run `pnpm install` at the repo root first.

set -euo pipefail

EXAMPLE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$EXAMPLE_DIR"

APP_NAME="$(node -p "require('./app.json').name")"
RN_VERSION="$(node -p "require('./package.json').dependencies['react-native']")"

echo "==> Bare RN CLI setup for '${APP_NAME}' (react-native ${RN_VERSION})"

# --- Guard 1: node must be on PATH (gradle invokes `node` at build time) -------
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: 'node' is not on PATH. If you use nvm, run 'nvm use' first." >&2
  exit 1
fi

# --- 1 & 2: scaffold native projects from a throwaway init --------------------
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Scaffolding native projects (throwaway init in a temp dir)..."
npx --yes @react-native-community/cli@latest init "$APP_NAME" \
  --directory "$TMP_DIR/$APP_NAME" \
  --version "$RN_VERSION" \
  --install-pods false \
  --skip-git-init \
  --skip-install

echo "==> Copying android/ and ios/ into the example..."
rm -rf "$EXAMPLE_DIR/android" "$EXAMPLE_DIR/ios"
cp -R "$TMP_DIR/$APP_NAME/android" "$EXAMPLE_DIR/android"
cp -R "$TMP_DIR/$APP_NAME/ios" "$EXAMPLE_DIR/ios"

# --- Guard 2: @expo/cli must be resolvable (gradle's export:embed needs it) ---
# In some dependency trees npm/pnpm nest @expo/cli instead of hoisting it, which
# makes the gradle `cliFile` line resolve to a directory and the release build fail.
if ! node -e "require.resolve('@expo/cli')" >/dev/null 2>&1; then
  echo "WARNING: '@expo/cli' is not resolvable from this package." >&2
  echo "         If release builds fail with 'cliFile ... is not a file', add it explicitly:" >&2
  echo "         pnpm --filter @swmansion/react-native-detour-bare-react-native-cli add @expo/cli" >&2
fi

# --- 3: install Expo Modules native config -----------------------------------
# Back up metro.config.js — `install-expo-modules` migrates it to a plain
# expo/metro-config and would drop our monorepo resolver wiring.
cp metro.config.js metro.config.js.bak

echo "==> Installing Expo Modules (install-expo-modules)..."
yes | npx --yes install-expo-modules@latest

# --- 4: restore our monorepo-aware metro config ------------------------------
mv metro.config.js.bak metro.config.js

echo ""
echo "==> Done. Native projects generated and Expo Modules configured."
echo "    Next:"
echo "      1. cp .env.example .env   # then add your Detour credentials"
echo "      2. pnpm ios   # or: pnpm android"
