import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "off",
      "react-hooks/rules-of-hooks": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "react/no-unescaped-entities": "off",
      "react-compiler/react-compiler": "off"
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "*.js"
  ]),
]);

export default eslintConfig;
