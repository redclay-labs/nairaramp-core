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

## 2026-11-07 - Step 08: createRamp, Signer and keypair signer

- **What was built:**
  - `src/signers/types.ts`: Defined `Signer` interface with `getPublicKey(): Promise<string>` and `signTransaction(xdr: string, networkPassphrase: string): Promise<string>`.
  - `src/signers/keypair.ts`: Implemented `keypairSigner(secretKey: string): Signer` using `Keypair.fromSecret` and `TransactionBuilder.fromXDR`. Verified secret keys are never logged.
  - `src/ramp.ts`: Implemented `createRamp({ network, anchorId, signer })` returning `Ramp` client. Bridged `Signer` to `@stellar/typescript-wallet-sdk`'s `WalletSigner` (`signWithClientAccount` and `signWithDomainAccount`). Built SEP-10 JWT authentication via `anchor.sep10.authenticate`, with base64url JWT payload parsing and proactive caching up to 60 seconds prior to `exp`. Built typed error mapping (`ANCHOR_NOT_FOUND`, `ANCHOR_UNREACHABLE`, `AUTH_FAILED`, `SIGNER_REJECTED`) retaining underlying cause.
  - `src/index.ts`: Re-exported `Signer`, `keypairSigner`, `createRamp`, `Ramp`, and `CreateRampOptions`.
  - `test/signers/keypair.test.ts`: Created unit tests for `keypairSigner` verifying public key derivation, Ed25519 signature generation, and rejection of invalid transaction XDR.
  - `test/ramp.test.ts`: Created comprehensive unit test suite with mocked Wallet SDK (`vi.mock`), testing token retrieval, caching, refresh after expiry threshold with fake timers, network passphrase selection per network, and error mapping for network failures, auth failures, and signer rejections.
- **Commands run with results:**
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 31 tests across 5 test files (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 09: SEP-10 integration test

- **What was built:**
  - `test/integration/helpers.ts`: Implemented `createFundedTestAccount()` to generate a random `Keypair`, fund it via friendbot (`https://friendbot.stellar.org?addr=<publicKey>`) with a 3-second retry on failure, and return the secret key. Implemented `addTrustline(secret, assetCode, issuer)` to submit a `changeTrust` operation to `https://horizon-testnet.stellar.org` using Horizon `Server` and `TransactionBuilder`.
  - `test/integration/sep10.test.ts`: Created integration test guarded by `describe.skipIf(process.env.RUN_INTEGRATION !== "1")`. Funds a test account via friendbot, initializes `createRamp` for `sdf-testanchor` with `keypairSigner`, calls `authenticate()`, and asserts that a valid 3-part dot-separated JWT token is returned.
  - `src/ramp.ts`: Enhanced `createRamp` to handle `@stellar/typescript-wallet-sdk`'s synchronous `signWithClientAccount` signature interface by awaiting the async signing promise in `sep10.sign` before token exchange, and appended only newly created signatures to avoid duplicating challenge server signatures.
- **Commands run with results:**
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, 31 passed, 1 integration test skipped as expected when `RUN_INTEGRATION` is unset (exit code 0).
  - `pnpm test:integration`: Ran live integration test against Stellar testnet and `sdf-testanchor`, passed 1 test (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 10: Freighter and Wallets Kit signers

- **What was built:**
  - Added `@stellar/freighter-api` (pinned to `6.0.1`) and `@creit.tech/stellar-wallets-kit` (pinned to `2.8.0`) as optional `peerDependencies` (with `peerDependenciesMeta` optional: true) and as `devDependencies`.
  - Updated `package.json` and `VERSIONS.md`.
  - `src/signers/freighter.ts`: Implemented `freighterSigner(): Signer` using dynamic `import("@stellar/freighter-api")` to allow bundling and usage without Freighter installed. Handled `getAddress` and `signTransaction` with exact return types, mapping rejections and `{ error }` payload responses to `NairaRampError("SIGNER_REJECTED")`.
  - `src/signers/walletsKit.ts`: Implemented `walletsKitSigner(kit): Signer` taking an already initialized kit instance. Extracted address via kit's address methods and invoked `signTransaction` passing `networkPassphrase` and `address`. Mapped rejections and error-field payloads to `NairaRampError("SIGNER_REJECTED")`.
  - `src/index.ts`: Re-exported `freighterSigner`, `walletsKitSigner`, and `WalletsKitLike`.
  - `test/signers/freighter.test.ts`: Created comprehensive unit tests with mocked `@stellar/freighter-api` covering public key return, signed XDR return, rejection mapping, and error-field response mapping.
  - `test/signers/walletsKit.test.ts`: Created comprehensive unit tests with mocked kit instance covering public key return (via `getAddress` and `address`), signed XDR return with parameters, rejection mapping, and error-field response mapping.
- **Commands run with results:**
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 44 tests across 7 test files, 1 integration test skipped (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 11: SEP-24 deposit

- **What was built:**
  - `src/ramp.ts`:
    - Defined and exported `AnchorTransaction` type derived via `Pick<>` from `@stellar/typescript-wallet-sdk`'s `Types.DepositTransaction & Types.WithdrawTransaction` (`id`, `status`, `amount_in`, `amount_out`, `withdraw_anchor_account`, `withdraw_memo`, `withdraw_memo_type`, `stellar_transaction_id`, `message`).
    - Extended `Ramp` interface and implementation with:
      - `deposit({ assetCode, amount }): Promise<{ id: string; url: string }>`:
        - Validates `assetCode` against anchor registry assets upfront, throwing `NairaRampError("UNSUPPORTED_ASSET")` immediately before any network or auth call.
        - Calls `authenticate()` to obtain valid SEP-10 JWT.
        - Calls Wallet SDK SEP-24 `anchorClient.sep24().deposit(...)` with `assetCode`, `authToken` (`Types.AuthToken.from`), `destinationAccount` (`signer.getPublicKey()`), and passes `extraFields: { amount }` only if `amount` is given.
        - Returns `{ id, url }` from the interactive deposit response.
      - `getTransaction(id): Promise<AnchorTransaction>`:
        - Authenticates and retrieves transaction status via Wallet SDK `anchorClient.sep24().getTransactionBy({ authToken, id })`.
      - Extracted `mapAnchorError` helper mapping network errors to `ANCHOR_UNREACHABLE`, 401/403/unauthorized to `AUTH_FAILED`, and signer errors to `SIGNER_REJECTED`.
  - `src/index.ts`: Re-exported `AnchorTransaction` and `DepositOptions`.
  - `test/ramp.test.ts`: Added unit tests for `deposit` and `getTransaction` with mocked Wallet SDK SEP-24:
    - Rejection on unsupported asset before any network or auth call.
    - Deposit with and without `amount`.
    - Verification of returned `{ id, url }`.
    - Error mapping for missing response id/url, 401 auth failure, network unreachable, and signer rejection.
    - Transaction lookup with returned id, status, and error mappings.
  - `test/integration/sep24.test.ts`: Added live integration test against Stellar testnet and `sdf-testanchor`:
    - Funds test account via friendbot.
    - Adds trustline for `SRT` (issuer from registry).
    - Calls `ramp.deposit({ assetCode: "SRT", amount: "10" })`, asserting valid `id` and `https://` interactive url.
    - Calls `ramp.getTransaction(id)`, asserting transaction `id` and `status === "incomplete"`.
- **Commands run with results:**
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 54 tests across 7 test files, 2 integration tests skipped (exit code 0).
  - `pnpm test:integration`: Ran live integration tests against Stellar testnet and `sdf-testanchor`, 2 passed (SEP-10 in 20.9s, SEP-24 in 17.0s) (exit code 0).
- **Open issues:** None.
