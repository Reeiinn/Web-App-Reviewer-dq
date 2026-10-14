import next from "eslint-config-next";

/**
 * Next's own rules, over the app's source.
 *
 * There was no linter here at all, and `next lint` — the obvious thing to put
 * in a lint script — was removed in Next 16, so this wires ESLint up directly.
 * eslint-config-next ships flat config, so it is imported rather than bridged
 * through FlatCompat.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "scripts/**",
      "src/generated/**",
      "src/migration/archive/**",
    ],
  },
  ...next,
  {
    rules: {
      /*
       * The React Compiler rules, reporting rather than failing.
       *
       * They arrived with this config on code that predates them. The reads
       * of a ref during render have been worked through; four places still
       * set state from an effect on purpose (the photo cropper's portal
       * mount, the roster's loading flag, the dashboard menu closing, the
       * practice exam's one-shot scroll). Rewriting those changes when the
       * screens render, so they stay visible as warnings rather than failing
       * the build.
       */
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default config;
