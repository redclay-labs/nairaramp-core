# Progress log

## 2026-11-07 - Step 00: Rules & Repository Baseline

- **What was built:** Initialized core rule and log files (`AGENTS.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/UPSTREAM-REQUESTS.md`, `VERSIONS.md`). Checked Git origin remote URL and verified target branch `main`.
- **Commands run with results:**
  - `git remote -v`: Verified origin points to `https://github.com/redclay-labs/nairaramp-core.git` (exit code 0).
  - `git branch --show-current`: Verified current branch is `main` (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 01: Package scaffold

- **What was built:** Initialized empty TypeScript package at the repository root (`@nairaramp/core` v0.0.0). Created `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`, `.gitignore`, `.nvmrc`, `src/index.ts` exporting `VERSION = "0.0.0"`, and `test/smoke.test.ts`. Installed exact pinned dependencies (`@stellar/typescript-wallet-sdk` 6.0.0, `@stellar/stellar-sdk` 17.4.0) and devDependencies. Verified deduplication of `@stellar/stellar-sdk` to single version 17.4.0.
- **Commands run with results:**
  - `pnpm install`: Installed all pinned dependencies successfully (exit code 0).
  - `pnpm why @stellar/stellar-sdk`: Confirmed single version `17.4.0` (exit code 0).
  - `pnpm build`: Built ESM, CJS, and DTS distributions to `dist/` via `tsup` (exit code 0).
  - `pnpm test`: Ran smoke test via `vitest run`, passed 1 test (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 02: Continuous integration

- **What was built:** Added GitHub Actions CI workflow in `.github/workflows/ci.yml`. Configured matrix testing across Node 20 and Node 22 on `ubuntu-latest`, triggered on push and pull_request against `main`. Steps: checkout (`actions/checkout@v7`), setup pnpm (`pnpm/action-setup@v6` with packageManager version), setup Node (`actions/setup-node@v7` with pnpm cache), frozen lockfile install, lint, typecheck, build, and test. Validated YAML syntax via `js-yaml`.
- **Commands run with results:**
  - `npx --yes js-yaml .github/workflows/ci.yml`: Successfully parsed workflow YAML into valid AST/JSON (exit code 0).
  - `pnpm lint`: Passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Passed with 0 errors (exit code 0).
  - `pnpm test`: Passed 1 test (exit code 0).
  - `pnpm build`: Built cleanly to `dist/` (exit code 0).
- **Open issues:** None.
