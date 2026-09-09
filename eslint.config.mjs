import next from "eslint-config-next";

/**
 * Next's own rules, over the app's source.
 *
 * There was no linter here at all, and `next lint` — the obvious thing to put
 * in a lint script — was removed in Next 16, so this wires ESLint up directly.
 * eslint-config-next ships flat config, so it is imported rather than bridged
 * through FlatCompat.
 */
export default [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**"],
  },
  ...next,
  {
    rules: {
      /*
       * The React Compiler rules, reporting rather than failing.
       *
       * They arrived with this config on code that predates them, and they
       * flag sixteen places across the study screens, the roster and the photo
       * cropper — reads of a ref during render, and state set from an effect.
       * Every one is worth working through, and none of them is a bug today:
       * failing the build on them would mean either a sweeping refactor of the
       * screens in the same breath as wiring up a linter, or the linter being
       * switched off again. They stay visible instead, and come down over time.
       */
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
];
