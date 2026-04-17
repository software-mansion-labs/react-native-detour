module.exports = {
  arrowParens: "always",
  bracketSpacing: true,
  jsxSingleQuote: false,
  quoteProps: "as-needed",
  singleQuote: false,
  semi: true,
  printWidth: 100,
  useTabs: false,
  tabWidth: 2,
  trailingComma: "all",
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: [
    // React & React Native core
    "^react$",
    "^react-native$",
    // Expo packages
    "^expo(.*)$",
    // Third-party packages
    "<THIRD_PARTY_MODULES>",
    // Internal monorepo packages
    "^@swmansion/(.*)$",
    // Relative imports
    "^[./]",
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  overrides: [
    {
      files: "entrypoint.js",
      options: {
        plugins: [],
      },
    },
  ],
};
