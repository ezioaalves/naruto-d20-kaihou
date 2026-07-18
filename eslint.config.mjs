import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

/**
 * Foundry VTT and PF1e globals exposed at runtime. These are provided by the
 * host (Foundry core + the pf1 system) and are read-only from this module.
 */
const foundryGlobals = {
  // Foundry core
  foundry: "readonly",
  game: "readonly",
  ui: "readonly",
  canvas: "readonly",
  CONFIG: "readonly",
  CONST: "readonly",
  Hooks: "readonly",
  Roll: "readonly",
  ChatMessage: "readonly",
  Actor: "readonly",
  Item: "readonly",
  Folder: "readonly",
  Application: "readonly",
  FormApplication: "readonly",
  ItemSheet: "readonly",
  ActorSheet: "readonly",
  Dialog: "readonly",
  Handlebars: "readonly",
  TextEditor: "readonly",
  fromUuid: "readonly",
  fromUuidSync: "readonly",
  renderTemplate: "readonly",
  loadTemplates: "readonly",
  duplicate: "readonly",
  mergeObject: "readonly",
  getProperty: "readonly",
  setProperty: "readonly",
  expandObject: "readonly",
  flattenObject: "readonly",
  Items: "readonly",
  // jQuery — Foundry bundles and exposes it globally
  $: "readonly",
  jQuery: "readonly",
  // pf1 system
  pf1: "readonly",
  RollPF: "readonly",
  // socketlib module
  socketlib: "readonly",
};

/**
 * Vitest test globals. These are injected by Vitest and available in test files.
 */
const vitestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  vi: "readonly",
  beforeEach: "readonly",
  beforeAll: "readonly",
  afterEach: "readonly",
  afterAll: "readonly",
};

export default [
  {
    ignores: ["node_modules/**", "packs/**", "dist/**", "public/**", "pf1/**", "pf1-source/**"],
  },
  js.configs.recommended,
  // Module runtime — runs inside Foundry (browser + Foundry/PF1 globals).
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...foundryGlobals,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-undef": "error",
      eqeqeq: ["warn", "smart"],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
  // Node tooling — CLI scripts in tools/ run under Node.
  {
    files: ["tools/**/*.mjs", "*.config.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
  // Wizard, downtime, and shared apps — pure modules + tests run under Node with Vitest.
  {
    files: [
      "scripts/wizard/**/*.mjs",
      "scripts/downtime/**/*.mjs",
      "scripts/apps/kaihou-application.mjs",
      "tests/wizard/**/*.mjs",
      "tests/downtime/**/*.mjs",
      "tests/apps/**/*.mjs",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...vitestGlobals,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
  // Disable stylistic rules that conflict with Prettier.
  prettier,
];
