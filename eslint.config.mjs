import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/*.gen.ts",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
      "db-data/**",
      "node_modules/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [importPlugin.flatConfigs.recommended],
    settings: {
      "import/core-modules": ["react-native"],
      "import/ignore": ["react-native"],
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "import/no-unresolved": "off",
      "import/namespace": "off",
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
          pathGroups: [
            {
              pattern: "{react,react-dom/**,react-router-dom,hono,hono/**}",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@frontend/**,@backend/**,@infra/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@dtos/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@hooks/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@components/ui",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@components/**",
              group: "internal",
              position: "after",
            },
          ],
        },
      ],
    },
  },
);
