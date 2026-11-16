import tsPlugin from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "coverage/**"],
  },
  ...tsPlugin.configs.recommended,
];
