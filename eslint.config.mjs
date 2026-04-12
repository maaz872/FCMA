import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    ".claude/**",
  ]),
  {
    rules: {
      // React Compiler strict-mode rules — downgrade to warnings.
      // These flag patterns that are technically impure but are standard
      // in Next.js server components and React patterns. Not actual bugs.
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // Allow any in a few infra files (Prisma proxy, seed scripts)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow @ts-expect-error without long descriptions in test files
      "@typescript-eslint/ban-ts-comment": "warn",
      // Allow <img> — we use base64 data URLs from DB, not static assets
      "@next/next/no-img-element": "off",
      // Allow unused vars prefixed with _ or in specific patterns
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-unused-expressions": "warn",
      // Allow anonymous default exports in k6 load test files
      "import/no-anonymous-default-export": "warn",
    },
  },
]);

export default eslintConfig;
