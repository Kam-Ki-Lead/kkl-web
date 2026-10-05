import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/*
 * eslint-config-next 16 ships native flat configs. Loading them through
 * FlatCompat (as the initial scaffold did) throws "Converting circular structure
 * to JSON" while validating the legacy shape, so they are imported directly.
 */
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // An underscore prefix is how this codebase says "this parameter is
      // part of the signature and deliberately unused" — levelDisplay keeps
      // its snapshot argument so callers do not change when the
      // question-to-level mapping is confirmed. Without this the convention
      // cannot be expressed and the warning has to be lived with instead.
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      // The rejected Phase 1 prototype is preserved as a reference artifact and
      // is deliberately not held to the application's lint rules.
      "docs/design/prototype/**",
    ],
  },
];

export default config;
