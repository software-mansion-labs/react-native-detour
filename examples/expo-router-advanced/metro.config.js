const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const { getDefaultConfig } = require('@expo/metro-config');
const glob = require('fast-glob');

const root = path.resolve(__dirname, '../..');

// Inline equivalent of react-native-monorepo-config's withMetroConfig.
// The npm package is ESM-only (v0.1.10+) and cannot be require()'d in a CJS
// config file that Metro loads via cosmiconfig.
function withMetroConfig(baseConfig, { root: rootDir, dirname: projectDir }) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
  );

  if (pkg.workspaces == null) {
    throw new Error(`No 'workspaces' field found in '${rootDir}/package.json'`);
  }

  const workspacePatterns = Array.isArray(pkg.workspaces)
    ? pkg.workspaces
    : pkg.workspaces.packages;

  const packages = Object.fromEntries(
    workspacePatterns
      .flatMap((pattern) =>
        glob.sync(pattern, {
          cwd: rootDir,
          onlyDirectories: true,
          ignore: ['**/node_modules', '**/.git', '**/.yarn'],
        })
      )
      .map((p) => path.join(rootDir, p))
      .filter((dir) => {
        if (path.relative(dir, projectDir) === '') return false;
        return fs.existsSync(path.join(dir, 'package.json'));
      })
      .map((dir) => {
        const pak = JSON.parse(
          fs.readFileSync(path.join(dir, 'package.json'), 'utf8')
        );
        return [pak.name, dir];
      })
  );

  if (pkg.name) {
    packages[pkg.name] = rootDir;
  }

  // Escape a string for use in a RegExp
  const escapeRegExp = (s) => s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');

  const req = createRequire(path.join(projectDir, 'package.json'));

  const getPackageDir = (name) => {
    try {
      return path.dirname(req.resolve(`${name}/package.json`));
    } catch {
      return [projectDir, rootDir]
        .map((d) => path.join(d, 'node_modules', name))
        .find((d) => fs.existsSync(d));
    }
  };

  const getPeerDeps = (name, seen = new Set()) => {
    if (seen.has(name)) return [];
    seen.add(name);
    const dir = getPackageDir(name);
    if (!dir) return [];
    const pak = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    if (!pak.peerDependencies) return [];
    return [
      ...Object.keys(pak.peerDependencies),
      ...Object.keys(pak.peerDependencies).flatMap((m) => getPeerDeps(m, seen)),
    ];
  };

  const peers = Object.values(packages)
    .flatMap((dir) => {
      const pak = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      return pak.peerDependencies ? Object.keys(pak.peerDependencies) : [];
    })
    .sort()
    .flatMap((m) => [m, ...getPeerDeps(m)])
    .filter((m, i, self) => self.lastIndexOf(m) === i);

  const extraNodeModules = peers.reduce((acc, name) => {
    const dir = getPackageDir(name);
    if (dir) acc[name] = dir;
    return acc;
  }, {});

  if (pkg.name) {
    extraNodeModules[pkg.name] = rootDir;
  }

  const blockList = new RegExp(
    '(' +
      Object.values(packages)
        .flatMap((dir) =>
          peers.map(
            (m) => `^${escapeRegExp(path.join(dir, 'node_modules', m))}\\/.*$`
          )
        )
        .join('|') +
      ')$'
  );

  return {
    ...baseConfig,
    projectRoot: projectDir,
    watchFolders: [rootDir],
    resolver: {
      ...baseConfig.resolver,
      blockList,
      extraNodeModules,
      resolveRequest: (originalContext, moduleName, platform) => {
        let context = originalContext;

        if (packages[moduleName]) {
          context = {
            ...context,
            mainFields: ['source', ...context.mainFields],
            unstable_conditionNames: [
              'source',
              ...context.unstable_conditionNames,
            ],
          };
        }

        if (baseConfig.resolver && baseConfig.resolver.resolveRequest) {
          return baseConfig.resolver.resolveRequest(context, moduleName, platform);
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };
}

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

config.resolver.unstable_enablePackageExports = true;
// Ensure 'react-native' condition is checked for subpath package exports
// (e.g. '@swmansion/react-native-detour/expo-router') so Metro resolves to
// source TypeScript entries rather than missing pre-built artifacts.
config.resolver.unstable_conditionNames = ['react-native', 'require', 'default'];

module.exports = config;
