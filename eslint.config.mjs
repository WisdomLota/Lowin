import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Data is fetched on mount via effects + local state (no data-fetching library
      // in these hooks), so setState inside an effect is intentional.
      "react-hooks/set-state-in-effect": "off",
      // Logos are small, local or arbitrary remote URLs (coin images), where next/image
      // would need a remotePatterns entry for every host.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
