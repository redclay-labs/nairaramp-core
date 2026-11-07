import tsPlugin from "typescript-eslint";

export default [
  {
    ignores: ["dist/**"],
  },
  ...tsPlugin.configs.recommended,
];
