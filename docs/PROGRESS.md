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

## 2026-11-07 - Step 12: Transaction watcher

- **What was built:**
  - `src/watcher.ts`:
    - Defined `TransactionStatus` type with 15 SEP-24 statuses.
    - Defined `TERMINAL_STATUSES` constant array (`completed`, `refunded`, `expired`, `no_market`, `too_small`, `too_large`, `error`).
    - Defined `WatchHandlers`, `WatchSubscription`, and `WatchableRamp` interfaces.
    - Implemented `watchTransaction(ramp, id, handlers)`:
      - Uses chained `setTimeout` (never `setInterval`) with concurrency guard (`isPolling`).
      - Starts at 2000 ms, multiplies by 1.5 while status is unchanged, caps at 30000 ms, and resets delay to 2000 ms upon status change.
      - Emits `onStatus(status, transaction)` strictly on status changes (and initial poll).
      - Handles terminal statuses: calls `onComplete(transaction)` on `completed`; calls `onError(TRANSACTION_FAILED)` with anchor's message on other terminal statuses.
      - Tracks consecutive failures: stops and emits `onError(ANCHOR_UNREACHABLE)` after 5 consecutive polling failures; resets failure counter on success.
      - Treats unknown status strings as non-terminal, emitting `onStatus` and continuing polling.
      - Implements `stop()` method to cleanly cancel pending timers, leaving 0 timers active.
  - `src/ramp.ts`: Added `watch(id, handlers)` to `Ramp` interface and returned client object.
  - `src/index.ts`: Re-exported `TransactionStatus`, `TERMINAL_STATUSES`, `TerminalStatus`, `WatchHandlers`, `WatchSubscription`, `WatchableRamp`, and `watchTransaction`.
  - `test/watcher.test.ts`: Created comprehensive fake-timer test suite covering:
    - Exact backoff sequence: 2000, 3000, 4500, 6750, 10125, 15187.5, 22781.25, 30000, 30000 ms while status is unchanged.
    - Reset to 2000 ms upon status change and `onStatus` invocation only on change.
    - Clean termination and `onComplete` invocation on `completed`.
    - Clean termination and `onError` (`TRANSACTION_FAILED`) invocation on each of the other 6 terminal statuses.
    - `stop()` clears timer and leaves `vi.getTimerCount() === 0`.
    - `stop()` called while poll is in-flight stops polling without emitting subsequent events.
    - Emitting `ANCHOR_UNREACHABLE` after 5 consecutive failures and resetting failure counter on success.
    - Non-terminal handling for unknown status strings.
  - `test/ramp.test.ts`: Added unit test verifying `ramp.watch` returns `{ stop }` and delegates polling to `getTransaction`.
- **Commands run with results:**
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 70 tests across 8 test files, 2 integration tests skipped (exit code 0).
  - `pnpm test:integration`: Ran live integration tests against Stellar testnet and `sdf-testanchor`, 2 passed (SEP-10 in 10.8s, SEP-24 in 16.5s) (exit code 0).
- **Open issues:** None.

## 2026-11-07 - Step 13: SEP-24 withdraw

- **What was built:**
  - `src/ramp.ts`:
    - Added `WithdrawOptions` interface and exposed `withdraw(options)` on `Ramp`:
      - Checks `assetCode` against anchor registry assets upfront, throwing `UNSUPPORTED_ASSET` before any network or auth call.
      - Authenticates via SEP-10 and invokes Wallet SDK SEP-24 `anchorClient.sep24().withdraw(...)` passing `assetCode`, `authToken`, `withdrawalAccount` (`signer.getPublicKey()`), and `extraFields: { amount }` only if given.
      - Maps errors to `NairaRampError` (`SIGNER_REJECTED`, `AUTH_FAILED`, `ANCHOR_UNREACHABLE`).
    - Added `completeWithdrawal(id): Promise<{ hash: string }>` on `Ramp`:
      - Retrieves transaction via `getTransaction(id)` and verifies `status === "pending_user_transfer_start"`, throwing `TRANSACTION_FAILED` naming the actual status on mismatch.
      - Verifies `withdraw_anchor_account` and `amount_in` presence.
      - Builds payment transaction via `@stellar/stellar-sdk` `TransactionBuilder` and `Operation.payment` (logging decision in `docs/DECISIONS.md`).
      - Resolves payment asset from transaction or anchor registry entry.
      - Handles each memo type: text memo (`Memo.text`), id memo (`Memo.id`), hash memo (decoded from base64 string to 32 bytes via `Buffer.from` and `Memo.hash`, validating 32-byte length), or missing memo (`Memo.none()`).
      - Loads source account from Horizon right before building, uses fee mode from Horizon `feeStats()` with fallback to 1000 stroops, and sets 180s timeout.
      - Signs transaction with `signer.signTransaction` and submits to Horizon, returning the transaction hash.
      - Maps Horizon submission failures to `TRANSACTION_FAILED` including `result_codes` (`transaction` and `operations`).
  - `src/index.ts`: Re-exported `WithdrawOptions`.
  - `test/ramp.test.ts`: Added unit tests for:
    - Unsupported asset rejection prior to auth/network.
    - Withdrawal initiation with and without amount.
    - Error mappings for missing response id/url, 401 auth failure, network unreachable, and signer rejection.
    - Status check throwing `TRANSACTION_FAILED` naming the actual status on mismatch.
    - Missing `withdraw_anchor_account` check.
    - All memo types: text memo, id memo, hash memo (decoded from base64), invalid hash memo length error, and missing memo (none).
    - Base fee stats mode and fallback to 1000 stroops.
    - Horizon error mapping including `result_codes`.
    - Signer rejection during payment signing.
  - `test/integration/withdraw.interactive.test.ts`: Added interactive integration test guarded by `RUN_INTEGRATION=1 && RUN_INTERACTIVE=1` (skipped by default in CI and testnet runs).
- **Commands run with results:**
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 85 tests across 8 test files, 3 integration test files skipped (exit code 0).
  - `pnpm test:integration`: Ran live integration tests against Stellar testnet and `sdf-testanchor`, 2 passed (SEP-10 in 10.2s, SEP-24 in 20.2s), interactive test skipped (exit code 0).
- **Open issues:** None.

## 2026-11-08 - Step 14: SEP-38 quotes

- **What was built:**
  - `src/quotes.ts`:
    - Defined `Quote` and `GetPriceOptions` interfaces.
    - Implemented `fetchPrice(options, ctx)`:
      - Validates exactly one of `sellAmount` or `buyAmount` is provided; otherwise throws `QUOTE_UNAVAILABLE` before any network or auth call.
      - Checks whether the anchor's registry `seps` includes `"sep38"`; otherwise throws `QUOTE_UNAVAILABLE` naming the anchor before any network or auth call.
      - Normalizes asset strings by trimming whitespace.
      - Authenticates via SEP-10 (`ctx.authenticate()`).
      - Calls Wallet SDK SEP-38 `anchorClient.sep38(token).price(...)` with `sellAsset`, `buyAsset`, `sellAmount` or `buyAmount`, and `context` (defaulting to `"sep6"`).
      - Normalizes the response into `Quote` strictly converting all numeric values to strings (`sellAsset`, `buyAsset`, `sellAmount`, `buyAmount`, `price`, `totalFee`, `feeAsset`), ensuring no floats are returned.
      - Maps errors to `NairaRampError` (`SIGNER_REJECTED`, `AUTH_FAILED`, `QUOTE_UNAVAILABLE`, `ANCHOR_UNREACHABLE`).
  - `src/ramp.ts`: Exposed `getPrice(options)` on `Ramp` interface and implementation, delegating to `fetchPrice`.
  - `src/index.ts`: Re-exported `Quote` and `GetPriceOptions`.
  - `test/quotes.test.ts`: Added unit tests covering:
    - `QUOTE_UNAVAILABLE` when neither or both `sellAmount` and `buyAmount` are given (mock not called).
    - `QUOTE_UNAVAILABLE` naming the anchor when `seps` lacks `sep38` (mock not called).
    - Response normalization into `Quote` with strings and trimmed asset strings.
    - Floating point/numeric conversions to strings (never floats).
    - Fallback for missing fee objects.
    - Error mapping for 400 Bad Request, network errors, 401 Unauthorized, and signer rejection.
  - `test/integration/sep38.test.ts`: Added live testnet integration test:
    - Reads SEP-38 `/info` from `sdf-testanchor` first.
    - Selects a pair listed in `/info` (`stellar:SRT:...` and `iso4217:USD`).
    - Requests a price quote via `ramp.getPrice({ sellAsset, buyAsset, sellAmount: "5" })`.
    - Asserts that all returned fields are valid non-empty strings.
- **Commands run with results:**
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 95 tests across 9 test files, 4 integration files skipped (exit code 0).
  - `pnpm test:integration`: Ran live testnet integration tests, 3 passed (SEP-10 in 24.6s, SEP-24 in 34.4s, SEP-38 in 14.0s), 1 interactive test skipped (exit code 0).
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
- **Open issues:** None.

## 2026-11-08 - Step 15: Mainnet safety guard

- **What was built:**
  - `src/guard.ts`:
    - Implemented and exported `assertNetworkAllowed({ network, anchor, allowMainnet, now })`.
    - If `network === "mainnet"` and `allowMainnet !== true`, throws `NairaRampError("MAINNET_NOT_ALLOWED")`.
    - If `anchor.network !== network`, throws `NairaRampError("ANCHOR_NOT_FOUND")` explaining the mismatch (naming the anchor, anchor network, and requested network).
    - If `network === "mainnet"` and `anchor.verifiedAt` is older than 90 days relative to `now()` (or `new Date()`), throws `NairaRampError("ANCHOR_NOT_VERIFIED")` naming the anchor and its `verifiedAt`.
    - Ensured testnet operations are otherwise unaffected.
  - `src/ramp.ts`:
    - Updated `CreateRampOptions` to accept optional `allowMainnet?: boolean` and `now?: () => Date`.
    - Invoked `assertNetworkAllowed` first in `createRamp`.
  - `src/index.ts`: Re-exported `assertNetworkAllowed` and `AssertNetworkAllowedOptions`.
  - `test/guard.test.ts`:
    - Added comprehensive unit test suite covering every branch with a fixed date (`2026-10-01T00:00:00.000Z`).
    - Verified `allowMainnet` undefined and explicit false throw `MAINNET_NOT_ALLOWED`.
    - Verified network mismatch throws `ANCHOR_NOT_FOUND` explaining the mismatch.
    - Verified the exact 90-day boundary:
      - 91 days (`2026-07-02`): throws `ANCHOR_NOT_VERIFIED` naming anchor and `verifiedAt`.
      - Exact 90 days (`2026-07-03`): allowed without error.
      - 89 days (`2026-07-04`): allowed without error.
      - Invalid date string: throws `ANCHOR_NOT_VERIFIED`.
    - Verified testnet remains unaffected even with stale `verifiedAt` and `allowMainnet: false`.
    - Verified `createRamp` throws `MAINNET_NOT_ALLOWED` and `ANCHOR_NOT_FOUND` when appropriate.
- **Commands run with results:**
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 108 tests across 10 test files, 4 integration files skipped (exit code 0).
  - `pnpm test:integration`: Ran live testnet integration tests, 3 passed (SEP-10 in 12.2s, SEP-24 in 20.5s, SEP-38 in 19.1s), 1 interactive test skipped (exit code 0).
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
- **Open issues:** None.

## 2026-11-08 - Step 16: Research Nigerian anchors

- **What was built:**
  - Network and ecosystem research on Stellar anchors serving Nigeria using `curl` for all checks (Horizon mainnet, GitHub, domain `/.well-known/stellar.toml`, and advertised SEP endpoints):
    - Verified NGNC issuer `GASBV6W7GGED66MXEVC7YZHTWWYMSVYEY35USF2HJZBLABLYIFQGXZY6` on Horizon mainnet (6,468 accounts, ~83M circulating), confirming `home_domain: "ngnc.online"`. Verified `https://ngnc.online/.well-known/stellar.toml` (HTTP 200, CORS `*`), advertised SEP-10 (`https://anchor.ngnc.online/auth`) and SEP-24 (`https://anchor.ngnc.online/sep24`) endpoints, verified `/info` (deposit & withdraw enabled for NGNC with CORS).
    - Verified Cowrie candidate discovered via GitHub repo `ezedike-evan/corridor-in-a-box` (`corridors/ng-cowrie.corridor.yaml`). Verified issuer `GAWODAROMJ33V5YDFY3NPYTHVYQG7MJXVJ2ND3AOGIHYRWINES6ACCPD` on Horizon (8,606 accounts, ~44.8M circulating), confirming `home_domain: "cowrie.exchange"`. Verified `https://cowrie.exchange/.well-known/stellar.toml` (HTTP 200, CORS `*`), advertised SEP-10 (`https://api.cowrie.exchange/web_auth`), SEP-6 (`https://api.cowrie.exchange/transfer`), and SEP-12 (`https://api.cowrie.exchange/kyc`). Verified `/transfer/info` (deposit & withdraw enabled for NGNT with CORS, requires SEP-12 customer_id). SEP-24 is not supported.
    - Verified other candidates from `anchors.stellar.org` (Link, Busha, Yellow Card, Paychant, Chipper Cash, BlindPay), recording "could not verify" with trimmed raw evidence when endpoints failed, were missing, or returned errors.
  - `docs/anchors-nigeria.md`: Created research report with one section per anchor, date checked (`2026-11-08`), trimmed raw evidence, and one-line verdict. Credited `ezedike-evan/corridor-in-a-box` for Cowrie discovery.
  - Draft registry entries in `src/registry/drafts/`:
    - `src/registry/drafts/ngnc.json`: Registered NGNC draft entry (`network: "mainnet"`, `seps: ["sep10", "sep24"]`, `countries: ["NG"]`, `verifiedAt: "2026-11-08"`).
    - `src/registry/drafts/cowrie.json`: Registered Cowrie draft entry (`network: "mainnet"`, `seps: ["sep6", "sep10", "sep12"]`, `countries: ["NG"]`, `verifiedAt: "2026-11-08"`).
  - Registry isolation guard and test:
    - `test/registry.test.ts`: Added unit tests confirming `src/registry/index.ts` does NOT mention `"drafts"`, and verifying all entries in `src/registry/drafts/` pass `AnchorEntrySchema`.
  - `docs/DECISIONS.md`: Logged Step 16 anchor draft findings and registry isolation.
- **Commands run with results:**
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 110 tests across 10 test files, 4 integration files skipped (exit code 0).
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
- **Open issues:** None.

## 2026-11-08 - Step 17: API docs and release preparation

- **What was built:**
  - `docs/API.md`: Comprehensive API reference covering every export of `src/index.ts` with exact TypeScript signatures, concise descriptions, thrown error codes, and practical code examples. Included the dedicated section "Exports used by nairaramp-react" listing: `createRamp`, `Ramp`, `Signer`, `TransactionStatus`, `TERMINAL_STATUSES`, `AnchorTransaction`, `NairaRampError`, `isNairaRampError`, and `NairaRampErrorCode`.
  - `README.md`: Complete package overview explaining purpose, installation instructions (`pnpm add @nairaramp/core`), a 15-line quickstart example (`createRamp` with `sdf-testanchor`, `keypairSigner`, `deposit`, and `watch`), testnet-only notice, links to `docs/API.md`, `docs/anchors-nigeria.md`, and `CONTRIBUTING.md`, and plain text mention of related repositories (`nairaramp-react`, `nairaramp-demo`).
  - Verified README example type correctness: Copied example to temporary `test/readme-example.ts`, ran `pnpm typecheck` (passed with code 0), and cleaned up the temporary file.
  - `CHANGELOG.md`: Created changelog following Keep a Changelog specification with a comprehensive `0.1.0` release entry.
  - Bumped version to `0.1.0`:
    - Updated `package.json` to version `"0.1.0"`.
    - Updated `src/index.ts` to `export const VERSION = "0.1.0";`.
    - Updated `test/smoke.test.ts` to expect `"0.1.0"`.
  - Package packaging verification:
    - Ran `pnpm build`, followed by `npm pack --dry-run` to verify that the tarball includes strictly `dist/`, `README.md`, `LICENSE`, and `package.json`.
    - Executed `npm pack`, installed the generated `.tgz` archive in a temporary directory outside the repository using `npm`, and confirmed ESM dynamic import `node -e "import('@nairaramp/core').then(m => console.log(Object.keys(m)))"` successfully resolved all 13 runtime exports. Cleaned up tarball and temporary directory.
  - `docs/DECISIONS.md`: Logged Step 17 release preparation 0.1.0 decisions.
- **Commands run with results:**
  - `pnpm lint`: Ran `eslint .`, passed with 0 errors (exit code 0).
  - `pnpm typecheck`: Ran `tsc --noEmit`, passed with 0 errors (exit code 0).
  - `pnpm test`: Ran Vitest unit tests, passed 110 tests across 10 test files, 4 integration files skipped (exit code 0).
  - `pnpm build`: Built ESM, CJS, and DTS bundles cleanly via `tsup` (exit code 0).
- **Open issues:** None.
