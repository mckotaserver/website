import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import astro from "eslint-plugin-astro";
import prettier from "eslint-config-prettier";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ignores = [
  "**/dist/**",
  "**/.wrangler/**",
  "**/.astro/**",
  "**/node_modules/**",
  "**/drizzle/migrations/**",
  "**/public/**",
];

const jsRecommended = {
  ...js.configs.recommended,
  files: ["**/*.{js,cjs,mjs,jsx}"],
};

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default [
  { ignores },
  jsRecommended,
  ...astro.configs["flat/recommended"],
  {
    files: ["packages/website/src/**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: [".astro"],
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./packages/website/tsconfig.json"],
        tsconfigRootDir,
      },
    },
    rules: {
      "astro/no-set-html-directive": "off",
    },
  },
  {
    files: ["**/*.{js,cjs,mjs,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
  },
  {
    files: [
      "packages/website/src/**/*.{js,jsx,ts,tsx}",
      "packages/website/src/**/*.astro",
    ],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
      },
    },
  },
  {
    files: [
      "packages/admin/app/client.{ts,tsx}",
      "packages/admin/app/islands/**/*.{ts,tsx}",
    ],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
      },
    },
  },
  {
    files: [
      "packages/admin/app/server.ts",
      "packages/admin/app/routes/**/*.{ts,tsx}",
    ],
    languageOptions: {
      globals: {
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        crypto: "readonly",
      },
    },
  },
  {
    files: [
      "**/*.config.{js,ts,mjs,cjs}",
      "**/*.{mts,cts}",
      "**/vite.config.ts",
    ],
    languageOptions: {
      globals: {
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
  },
  {
    files: ["packages/website/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./packages/website/tsconfig.json"],
        tsconfigRootDir,
      },
    },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      "no-undef": "off",
    },
  },
  {
    files: ["packages/admin/app/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./packages/admin/tsconfig.json"],
        tsconfigRootDir,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      "no-undef": "off",
    },
  },
  {
    files: ["packages/database/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./packages/database/tsconfig.json"],
        tsconfigRootDir,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended-type-checked"].rules,
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
  prettier,
];
