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

## 2026-11-07 - Step 03: License, security, contributing, README

- **What was built:** Added `LICENSE` (Apache 2.0 with copyright 2026 John Imeobong Abasiediedu), updated `package.json` with `"license": "Apache-2.0"`, created `SECURITY.md` (private vulnerability reporting policy), created `CONTRIBUTING.md` (project scope, setup, testnet tests, branch naming, Stellar Wave guidelines on Drips, and code rules), and created `README.md` with links to governance files.
- **Commands run with results:**
  - `pnpm build`: Built ESM, CJS, and DTS distributions to `dist/` via `tsup` (exit code 0).
  - `pnpm lint`: Passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Passed with 0 errors (exit code 0).
  - `pnpm test`: Ran unit smoke test, 1 passed (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 04: Issue and PR templates

- **What was built:** Added GitHub issue forms and PR template under `.github/`:
  - `.github/ISSUE_TEMPLATE/config.yml`: Disabled blank issues (`blank_issues_enabled: false`).
  - `.github/ISSUE_TEMPLATE/bug.yml`: Form for bugs with required dropdown Area (registry, signers, auth, deposit, withdraw, watcher, quotes, guard, docs), what happened, expected behaviour, reproduction steps, and version.
  - `.github/ISSUE_TEMPLATE/feature.yml`: Form for features with problem, proposed solution, required "Done when" checklist, and files to touch.
  - `.github/ISSUE_TEMPLATE/spike.yml`: Form for technical spikes with question to answer, what to investigate, and expected output.
  - `.github/pull_request_template.md`: PR template with "Closes #", summary, test evidence, and verification checklist.
  - Validated all YAML schemas via `js-yaml`.
- **Commands run with results:**
  - `npx --yes js-yaml .github/ISSUE_TEMPLATE/config.yml`: Validated YAML AST (exit code 0).
  - `npx --yes js-yaml .github/ISSUE_TEMPLATE/bug.yml`: Validated YAML AST (exit code 0).
  - `npx --yes js-yaml .github/ISSUE_TEMPLATE/feature.yml`: Validated YAML AST (exit code 0).
  - `npx --yes js-yaml .github/ISSUE_TEMPLATE/spike.yml`: Validated YAML AST (exit code 0).
  - `pnpm build`: Built cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Passed with 0 errors (exit code 0).
  - `pnpm test`: Ran unit smoke test, 1 passed (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 05: Anchor registry schema

- **What was built:** Added `zod` (pinned to `4.6.7`) as a runtime dependency. Created `src/registry/schema.ts` exporting `AnchorEntrySchema` and `AnchorEntry` type with Zod validations for `id`, `name`, `homeDomain`, `network`, `assets` (including `@stellar/stellar-sdk` `StrKey.isValidEd25519PublicKey`), `seps`, `countries` (ISO 3166-1 alpha-2), and `verifiedAt` (valid calendar date). Created `src/registry/anchors/.gitkeep` and `src/registry/index.ts` with browser-safe static registry loading, module-load validation, `getAnchor(id)`, and `listAnchors(filter)`. Exported registry functions and types from `src/index.ts`. Created `test/fixtures/valid-anchor.json` and test suite `test/registry.test.ts` covering schema validation, field error reporting, registry query/filtering, and automatic filesystem validation of all anchors in `src/registry/anchors/`.
- **Commands run with results:**
  - `pnpm install`: Installed `zod@4.6.7` (exit code 0).
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 9 tests across 2 test files (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 06: Register the SDF test anchor

- **What was built:** Fetched and inspected `https://testanchor.stellar.org/.well-known/stellar.toml` (observed endpoints for SEP-6, SEP-10, SEP-12, SEP-24, SEP-38, and currencies SRT, USDC, native). Queried `<TRANSFER_SERVER_SEP0024>/info` at `https://testanchor.stellar.org/sep24/info` and verified deposit and withdraw enabled status for SRT and USDC. Created `src/registry/anchors/sdf-testanchor.json` with observed configuration and verified Ed25519 issuer keys. Statically imported `sdfTestAnchor` into `src/registry/index.ts`. Added test assertion in `test/registry.test.ts` for `getAnchor("sdf-testanchor")`.
- **Commands run with results:**
  - `curl.exe -s https://testanchor.stellar.org/.well-known/stellar.toml`: Fetched live TOML configuration (exit code 0).
  - `curl.exe -s https://testanchor.stellar.org/sep24/info`: Fetched SEP-24 info endpoint (exit code 0).
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 10 tests across 2 test files (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 07: Typed errors

- **What was built:** Created `src/errors.ts` defining `NairaRampErrorCode` (11 distinct error codes), `NairaRampError` extending `Error` (with code, typed cause passed to ES2022 Error constructor, prototype restoration for CJS), and type predicate `isNairaRampError` supporting structural checks across duplicate package copies. Changed `getAnchor` in `src/registry/index.ts` to throw `NairaRampError("ANCHOR_NOT_FOUND", "Unknown anchor id: <id>")`. Exported error types and classes from `src/index.ts`. Added comprehensive unit tests in `test/errors.test.ts` (covering code, message, cause via options/direct argument, instanceof, and plain objects) and updated `test/registry.test.ts`.
- **Commands run with results:**
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 20 tests across 3 test files (exit code 0).
- **Open issues:** None.
