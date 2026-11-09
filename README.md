# @nairaramp/core

[![npm version](https://img.shields.io/npm/v/@nairaramp/core.svg?style=flat-square)](https://www.npmjs.com/package/@nairaramp/core)
[![Release](https://img.shields.io/github/v/tag/redclay-labs/nairaramp-core?label=release&style=flat-square)](https://github.com/redclay-labs/nairaramp-core/releases/tag/v0.1.0)
[![CI Workflow](https://img.shields.io/github/actions/workflow/status/redclay-labs/nairaramp-core/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/redclay-labs/nairaramp-core/actions)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![Node Engine](https://img.shields.io/badge/Node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white)](package.json)

**A production-ready TypeScript SDK that adds "Pay with Naira" (Fiat On-Ramp) and "Cash Out to Naira" (Fiat Off-Ramp) flows to Stellar applications through Stellar Anchors.**

Published on the npm registry as [`@nairaramp/core@0.1.0`](https://www.npmjs.com/package/@nairaramp/core) with git tag [`v0.1.0`](https://github.com/redclay-labs/nairaramp-core/releases/tag/v0.1.0).

---

## Notice & Safety Rules

> **Important — Testnet Default:** Mainnet anchor access is strictly guarded and disabled by default. Live mainnet transactions require an explicit opt-in flag (`allowMainnet: true`) and must pass automated freshness verification checks (`verifiedAt` within 90 days).

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Release Status (`v0.1.0`)](#release-status-v010)
- [Supported Stellar Standards (SEPs)](#supported-stellar-standards-seps)
- [Installation](#installation)
- [Quickstart: Pay with Naira (Deposit)](#quickstart-pay-with-naira-deposit)
- [Complete Walkthrough: Cash Out to Naira (Withdrawal)](#complete-walkthrough-cash-out-to-naira-withdrawal)
- [Indicative Price Quotes (SEP-38)](#indicative-price-quotes-sep-38)
- [Supported Signers](#supported-signers)
  - [1. Keypair Signer (In-Memory / Backend)](#1-keypair-signer-in-memory--backend)
  - [2. Freighter Browser Extension](#2-freighter-browser-extension)
  - [3. Stellar Wallets Kit (Multi-Wallet)](#3-stellar-wallets-kit-multi-wallet)
- [Transaction Watcher Engine](#transaction-watcher-engine)
- [Anchor Registry & Verification](#anchor-registry--verification)
- [Mainnet Safety Guard](#mainnet-safety-guard)
- [Error Handling & Error Codes](#error-handling--error-codes)
- [Development, Testing & Verification](#development-testing--verification)
- [Contributing & Seed Issues (Stellar Wave)](#contributing--seed-issues-stellar-wave)
- [Ecosystem & Related Repositories](#ecosystem--related-repositories)
- [License & Security](#license--security)

---

## Overview & Architecture

`@nairaramp/core` serves as the non-visual, pure-TypeScript engine for the NairaRamp ecosystem. It wraps complex Stellar Ecosystem Proposals into clean, ergonomic method calls without reinventing any underlying cryptographic or network protocols.

### Architectural Commitments

1. **Zero Re-Implementation of SEPs**:
   Built directly upon [`@stellar/typescript-wallet-sdk`](https://github.com/stellar/typescript-wallet-sdk) (v6.0.0) and [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk) (v17.4.0). All challenge signing, interactive web flow URLs, and JWT exchanges are delegated to official Stellar libraries.
2. **Framework Agnostic**:
   Contains zero React, JSX, or browser-only DOM dependencies. Works identically in Node.js server environments, serverless functions, background workers, and client-side bundlers (Vite, Webpack, Next.js).
3. **Pluggable Cryptographic Signers**:
   Abstracts private keys behind a simple, unified `Signer` interface. Applications can switch between raw seed keys, browser extensions, or multi-wallet modal connectors with zero code changes to transaction logic.
4. **Strict Error Isolation**:
   Every public function throws strictly instances of `NairaRampError`. Downstream apps can reliably handle network errors, auth rejections, and invalid assets without parsing arbitrary exception strings.
5. **Type Safety & Dual ESM/CJS Output**:
   Authored in TypeScript 5.8 with full type declarations (`.d.ts` and `.d.cts`) generated at build time via `tsup`.

---

## Release Status (`v0.1.0`)

`@nairaramp/core` is officially published and live on the public npm registry:

- **Registry Link**: [`https://www.npmjs.com/package/@nairaramp/core`](https://www.npmjs.com/package/@nairaramp/core)
- **Version**: `0.1.0`
- **Git Release Tag**: [`v0.1.0`](https://github.com/redclay-labs/nairaramp-core/releases/tag/v0.1.0)
- **Git Commit**: `f46ccb2`
- **Bundle Distribution**:
  - `dist/index.js` (ESM module, 29.6 KB)
  - `dist/index.cjs` (CommonJS module, 32.4 KB)
  - `dist/index.d.ts` & `dist/index.d.cts` (TypeScript type definitions, 5.5 KB)

Verify live installation:
```bash
npm view @nairaramp/core version
# 0.1.0
```

---

## Supported Stellar Standards (SEPs)

| Standard | Name | Implementation Details |
| :--- | :--- | :--- |
| **SEP-1** | Stellar Info TOML | Automatic discovery of anchor endpoints, accounts, and supported currencies. |
| **SEP-10** | Web Authentication | Multi-party challenge transaction signing, server signature verification, JWT token issuance, and in-memory caching with 5-minute pre-expiration proactive refresh. |
| **SEP-24** | Hosted Deposit | Upfront asset validation against anchor registry, interactive deposit URL retrieval, and state tracking. |
| **SEP-24** | Hosted Withdrawal | Interactive withdrawal initiation, state tracking, and payment fulfillment (`completeWithdrawal`). |
| **SEP-38** | Anchor Quotes | Indicative rate queries (`ramp.getPrice`), rigorous pair validation, and string-safe numerical normalization (zero float precision loss). |
| **SEP-6** | Non-Interactive Transfer | Researched and documented for anchors requiring direct programmatic transfers (e.g., Cowrie Exchange). |
| **SEP-12** | KYC API | Identity and KYC status verification architecture documented for Nigerian anchor onboarding. |

---

## Installation

Install `@nairaramp/core` using your preferred package manager:

```bash
# pnpm (recommended)
pnpm add @nairaramp/core

# npm
npm install @nairaramp/core

# yarn
yarn add @nairaramp/core

# bun
bun add @nairaramp/core
```

### Optional Peer Dependencies

If your application interacts directly with user browser wallets, install the optional wallet adapters:

```bash
# For Freighter wallet extension
pnpm add @stellar/freighter-api

# For Stellar Wallets Kit (Albedo, xBull, Hana, Rabet, WalletConnect)
pnpm add @creit.tech/stellar-wallets-kit
```

---

## Quickstart: Pay with Naira (Deposit)

Initiate an interactive fiat deposit flow (e.g., exchanging Nigerian Naira for Stellar assets) using the registered test anchor:

```typescript
import { createRamp, keypairSigner } from "@nairaramp/core";

// 1. Initialize Ramp client with an anchor and a signer
const ramp = createRamp({
  network: "testnet",
  anchorId: "sdf-testanchor",
  signer: keypairSigner("SD4WZX23G7Y7N5F2B5Q23J3S7A66GJJ244M37DGBM5X57Q4X5H62K22L"),
});

// 2. Initiate deposit flow
// Returns a unique transaction ID and the anchor's hosted interactive URL
const { id, url } = await ramp.deposit({
  assetCode: "SRT",
  amount: "100", // optional initial amount
});

console.log("Transaction ID:", id);
console.log("Direct user to interactive flow URL:", url);

// 3. Watch transaction status with exponential backoff
const subscription = ramp.watch(id, {
  onStatus: (status, tx) => {
    console.log(`Current transaction status: ${status}`);
  },
  onComplete: (tx) => {
    console.log("Deposit confirmed on Stellar ledger:", tx.stellar_transaction_id);
  },
  onError: (error) => {
    console.error("Deposit flow encountered an error:", error.message);
  },
});

// Later, if user navigates away or modal closes:
// subscription.stop();
```

---

## Complete Walkthrough: Cash Out to Naira (Withdrawal)

A complete off-ramp flow consists of three distinct stages:

1. **Initiate Withdrawal**: Request interactive hosted URL where the user enters their Nigerian bank account details (NUBAN, bank name).
2. **Monitor Status**: The anchor transitions the transaction to `pending_user_transfer_start` and provides a recipient account and memo.
3. **Fulfill Withdrawal (`completeWithdrawal`)**: Build, sign, and submit the on-chain Stellar payment transaction to the anchor.

```typescript
import { createRamp, keypairSigner } from "@nairaramp/core";

const ramp = createRamp({
  network: "testnet",
  anchorId: "sdf-testanchor",
  signer: keypairSigner("SD4WZX23G7Y7N5F2B5Q23J3S7A66GJJ244M37DGBM5X57Q4X5H62K22L"),
});

// Step 1: Initiate withdrawal
const { id, url } = await ramp.withdraw({
  assetCode: "SRT",
  amount: "50",
});

console.log("Open interactive withdrawal form in popup or iframe:", url);

// Step 2 & 3: Watch and automatically fulfill on-chain payment
const sub = ramp.watch(id, {
  onStatus: async (status, tx) => {
    console.log("Withdrawal status update:", status);

    // Anchor has collected bank details and is waiting for Stellar payment
    if (status === "pending_user_transfer_start") {
      console.log("Fulfilling on-chain withdrawal payment...");
      
      // completeWithdrawal:
      // - Loads user account from Horizon
      // - Retrieves optimal fee stats from Horizon feeStats API
      // - Decodes text, ID, or 32-byte base64 hash memo
      // - Signs payment via configured Signer
      // - Submits to Horizon and returns Stellar transaction hash
      const { hash } = await ramp.completeWithdrawal(id);
      console.log("Stellar payment successfully submitted! Hash:", hash);
    }
  },
  onComplete: (tx) => {
    console.log("Cash-out complete! Fiat funds disbursed to Nigerian bank account.");
  },
  onError: (err) => {
    console.error("Withdrawal error:", err.message);
  },
});
```

---

## Indicative Price Quotes (SEP-38)

Query real-time conversion rates between Stellar tokens and fiat currencies before initiating an on-ramp or off-ramp:

```typescript
import { createRamp, keypairSigner } from "@nairaramp/core";

const ramp = createRamp({
  network: "testnet",
  anchorId: "sdf-testanchor",
  signer: keypairSigner("SD4WZX23G7Y7N5F2B5Q23J3S7A66GJJ244M37DGBM5X57Q4X5H62K22L"),
});

// Request quote: selling 10 SRT for USD
const quote = await ramp.getPrice({
  sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
  buyAsset: "iso4217:USD",
  sellAmount: "10",
  context: "sep6", // optional, defaults to "sep6"
});

console.log("Conversion Price:", quote.price);
console.log("Estimated Buy Amount:", quote.buyAmount);
console.log("Estimated Total Fee:", quote.totalFee, quote.feeAsset);
```

> **String-Safe Arithmetic:** Notice that `price`, `sellAmount`, `buyAmount`, and `totalFee` are returned strictly as validated strings. Floating-point numbers are never emitted by the quote engine to prevent rounding inaccuracies.

---

## Supported Signers

`@nairaramp/core` ships with built-in adapters for all major Stellar signing environments:

### 1. Keypair Signer (In-Memory / Backend)
Ideal for server-side daemons, CLI scripts, backend test suites, and automated bots.

```typescript
import { keypairSigner } from "@nairaramp/core";

// Accepts 56-character Stellar secret seed starting with 'S'
const signer = keypairSigner("SD4WZX23G7Y7N5F2B5Q23J3S7A66GJJ244M37DGBM5X57Q4X5H62K22L");
```

### 2. Freighter Browser Extension
Integrates seamlessly with the official Freighter browser extension:

```typescript
import { freighterSigner } from "@nairaramp/core";

// Requires @stellar/freighter-api installed in your application
const signer = freighterSigner();
```

### 3. Stellar Wallets Kit (Multi-Wallet)
Integrates with `@creit.tech/stellar-wallets-kit`, enabling support for Albedo, xBull, Hana, Rabet, and WalletConnect:

```typescript
import { walletsKitSigner } from "@nairaramp/core";
import { StellarWalletsKit, WalletNetwork, allowAllModules } from "@creit.tech/stellar-wallets-kit";

const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: "albedo",
  modules: allowAllModules(),
});

const signer = walletsKitSigner(kit);
```

### Custom Signer Interface
You can implement the lightweight `Signer` contract for any custom custody or hardware solution:

```typescript
import type { Signer } from "@nairaramp/core";

const customSigner: Signer = {
  async getPublicKey(): Promise<string> {
    return "G...";
  },
  async signTransaction(xdr: string, options?: { networkPassphrase?: string }): Promise<string> {
    // Custom signing logic (e.g. Ledger, AWS KMS, Fireblocks)
    return signedXdr;
  },
};
```

---

## Transaction Watcher Engine

SEP-24 transactions require asynchronous polling as users interact with the anchor's web interface and banks process transfers. `@nairaramp/core` includes a hardened polling engine (`ramp.watch` / `watchTransaction`) designed for production resilience:

- **Sequential Execution**: Guarantees that subsequent polls never execute while a previous network request is in flight.
- **Exponential Backoff with Ceiling**: Starts polling at `2000ms`, multiplies by `1.5` on each poll (`2000ms` &rarr; `3000ms` &rarr; `4500ms` &rarr; ...), and caps at `30000ms`.
- **Status Change Reset**: Immediately resets polling interval to `2000ms` whenever the transaction status changes.
- **Transient Failure Tolerance**: Tolerates up to 5 consecutive network errors before terminating with `ANCHOR_UNREACHABLE`.
- **Clean Teardown**: Calling `.stop()` cancels all active timers and prevents further listener invocations.

```
+-------------------------------------------------------------+
|                      Transaction States                     |
+-------------------------------------------------------------+
| Non-Terminal:                                               |
|   - incomplete                                              |
|   - pending_user_transfer_start (Trigger completeWithdrawal)|
|   - pending_user_transfer_complete                          |
|   - pending_external                                        |
|   - pending_anchor                                          |
|   - pending_stellar                                         |
|   - pending_trust                                           |
|   - pending_user                                            |
+-------------------------------------------------------------+
| Terminal:                                                   |
|   - completed      --> triggers onComplete(tx)              |
|   - refunded       --> triggers onError(TRANSACTION_FAILED) |
|   - expired        --> triggers onError(TRANSACTION_FAILED) |
|   - no_market      --> triggers onError(TRANSACTION_FAILED) |
|   - too_small      --> triggers onError(TRANSACTION_FAILED) |
|   - too_large      --> triggers onError(TRANSACTION_FAILED) |
|   - error          --> triggers onError(TRANSACTION_FAILED) |
+-------------------------------------------------------------+
```

---

## Anchor Registry & Verification

Anchors are defined as strongly validated schemas (`AnchorEntrySchema` powered by `zod`):

```typescript
import { getAnchor, listAnchors } from "@nairaramp/core";

// Retrieve an anchor by ID
const anchor = getAnchor("sdf-testanchor");
console.log(anchor.name);        // "SDF Test Anchor"
console.log(anchor.homeDomain);  // "testanchor.stellar.org"
console.log(anchor.assets);      // [{ code: "SRT", issuer: "GCDNJUB..." }, ...]

// Filter active anchors
const testnetAnchors = listAnchors({ network: "testnet" });
const nigerianAnchors = listAnchors({ country: "NG" });
```

### Nigerian Anchors Audit & Drafts

During repository research, network audits of active Nigerian corridors were conducted against live Horizon nodes and Stellar TOML configurations (see [`docs/anchors-nigeria.md`](docs/anchors-nigeria.md)):

| Anchor | Asset | Home Domain | Supported SEPs | Status |
| :--- | :--- | :--- | :--- | :--- |
| **NGNC** (Link) | `NGNC` | `ngnc.online` | SEP-10, SEP-24 | Verified Mainnet Draft (`src/registry/drafts/ngnc.json`) |
| **Cowrie Exchange** | `NGNT` | `cowrie.exchange` | SEP-6, SEP-10, SEP-12 | Verified Mainnet Draft (`src/registry/drafts/cowrie.json`) |
| **SDF Test Anchor** | `SRT`, `USDC` | `testanchor.stellar.org` | SEP-6, SEP-10, SEP-24, SEP-38 | Active Testnet (`src/registry/anchors/sdf-testanchor.json`) |

> Draft entries live safely in `src/registry/drafts/` to guarantee that unverified or non-production anchors are not loaded by default.

---

## Mainnet Safety Guard

To prevent accidental fund losses in development or staging, `@nairaramp/core` enforces a mandatory safety guard (`assertNetworkAllowed`):

1. **Explicit Mainnet Opt-In**:
   Calling `createRamp` with `network: "mainnet"` requires setting `allowMainnet: true`. Omitting this flag immediately throws `MAINNET_NOT_ALLOWED`.
2. **Network Matching**:
   The requested anchor must be explicitly designated for the specified network. Attempting to use a testnet anchor on mainnet (or vice versa) throws `ANCHOR_NOT_FOUND`.
3. **90-Day Anchor Freshness Rule**:
   Mainnet anchors must have a verified inspection date (`verifiedAt`) within the last 90 calendar days. If the anchor entry has not been re-verified within 90 days, `ANCHOR_NOT_VERIFIED` is thrown before any network call is initiated.

```typescript
import { createRamp, keypairSigner } from "@nairaramp/core";

// Explicit opt-in required for mainnet:
const ramp = createRamp({
  network: "mainnet",
  anchorId: "ngnc",
  allowMainnet: true, // MANDATORY for mainnet
  signer: keypairSigner(process.env.STELLAR_SECRET_KEY!),
});
```

---

## Error Handling & Error Codes

Every public function throws strictly instances of `NairaRampError`. Inspect errors easily with the `isNairaRampError` type predicate:

```typescript
import { isNairaRampError } from "@nairaramp/core";

try {
  await ramp.deposit({ assetCode: "UNKNOWN" });
} catch (err) {
  if (isNairaRampError(err)) {
    console.error(`NairaRamp Error [${err.code}]:`, err.message);
    if (err.cause) {
      console.error("Underlying cause:", err.cause);
    }
  } else {
    console.error("Unexpected error:", err);
  }
}
```

### Complete Error Code Reference

| Error Code | Description | Typical Cause |
| :--- | :--- | :--- |
| `AUTH_FAILED` | SEP-10 authentication failed | Challenge expired, invalid server signature, or invalid token. |
| `ANCHOR_UNREACHABLE` | Network connection to anchor failed | Anchor endpoint is down, network timeout, or CORS failure. |
| `ANCHOR_NOT_FOUND` | Anchor ID not registered in registry | Typo in `anchorId` or anchor not configured for target network. |
| `KYC_REQUIRED` | Customer identification required | Anchor requires SEP-12 KYC before transfer initiation. |
| `QUOTE_EXPIRED` | SEP-38 price quote has expired | Quote expired before transaction was initiated. |
| `QUOTE_UNAVAILABLE` | Anchor cannot provide a price quote | Unsupported pair, anchor lacks SEP-38, or both amounts omitted. |
| `UNSUPPORTED_ASSET` | Asset code not supported by anchor | Requested asset not declared in anchor registry. |
| `SIGNER_REJECTED` | User or signer denied signature | User clicked "Cancel" in wallet extension or invalid secret key. |
| `TRANSACTION_FAILED` | On-chain or anchor transaction failed | Insufficient balance, bad memo, or Horizon rejection. |
| `MAINNET_NOT_ALLOWED` | Mainnet requested without opt-in | `allowMainnet: true` was not provided in options. |
| `ANCHOR_NOT_VERIFIED` | Anchor verification expired | Mainnet anchor `verifiedAt` is older than 90 days. |

---

## Development, Testing & Verification

The codebase maintains strict quality, linting, and testing standards:

```bash
# 1. Install exact pinned dependencies
pnpm install

# 2. Build ESM, CJS, and TypeScript declarations
pnpm build

# 3. Run ESLint (flat config)
pnpm lint

# 4. Run TypeScript type checks
pnpm typecheck

# 5. Run complete Vitest unit test suite (110 tests across 10 suites)
pnpm test

# 6. Run live Stellar Testnet integration tests (requires network)
pnpm test:integration

# 7. Generate test coverage report
pnpm exec vitest run --coverage
```

---

## Contributing & Seed Issues (Stellar Wave)

We actively welcome contributions! This project participates in the **Stellar Wave Program on Drips**.

Before submitting a pull request:
1. Review [`CONTRIBUTING.md`](CONTRIBUTING.md) for code style, branch naming, and testing standards.
2. Ensure `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass with zero errors.

### Curated Seed Issues for Outside Contributors

Explore our 9 targeted seed issues in [`docs/seed-issues.md`](docs/seed-issues.md):

| Issue | Title | Complexity | Reward Points |
| :--- | :--- | :--- | :--- |
| [#01](docs/seed-issues/01.md) | Add unit test coverage for `listAnchors` filtering by country & network | Trivial | 100 pts |
| [#02](docs/seed-issues/02.md) | Add unit test coverage for browser fallback JWT decoding in `src/ramp.ts` | Trivial | 100 pts |
| [#03](docs/seed-issues/03.md) | Document integration test flags and Friendbot testnet workflow | Trivial | 100 pts |
| [#04](docs/seed-issues/04.md) | Promote verified Nigerian mainnet draft anchors to active registry | Medium | 150 pts |
| [#05](docs/seed-issues/05.md) | Surface detailed Horizon result codes in `completeWithdrawal` failures | Medium | 150 pts |
| [#06](docs/seed-issues/06.md) | Add SEP-12 KYC status helper `ramp.getKycStatus()` | Medium | 150 pts |
| [#07](docs/seed-issues/07.md) | Probe alternate subdomains for unverified Nigerian anchor candidates | Medium | 150 pts |
| [#08](docs/seed-issues/08.md) | Implement SEP-6 non-interactive deposit flow (`ramp.depositSep6`) | High | 200 pts |
| [#09](docs/seed-issues/09.md) | Implement SEP-38 firm quote request (`ramp.requestQuote`) | High | 200 pts |

---

## Ecosystem & Related Repositories

The NairaRamp project is structured into three dedicated repositories:

- **[`@nairaramp/core`](https://github.com/redclay-labs/nairaramp-core)** (this repository): Core TypeScript SDK, anchor registry, SEP orchestration, and wallet signers.
- **[`nairaramp-react`](https://github.com/redclay-labs/nairaramp-react)**: React components, modal dialogs, hooks (`useRamp`, `useDeposit`, `useWithdraw`), and state providers.
- **[`nairaramp-demo`](https://github.com/redclay-labs/nairaramp-demo)**: Interactive Next.js reference application, [Live Demo](https://nairaramp-demo.vercel.app), and [Developer Quickstart](https://github.com/redclay-labs/nairaramp-demo/blob/main/docs/quickstart.md).

Related repositories: [nairaramp-react](https://github.com/redclay-labs/nairaramp-react), [nairaramp-demo](https://github.com/redclay-labs/nairaramp-demo) ([live demo](https://nairaramp-demo.vercel.app), [quickstart](https://github.com/redclay-labs/nairaramp-demo/blob/main/docs/quickstart.md))

---

## License & Security

- **License**: Licensed under the Apache License, Version 2.0. See [`LICENSE`](LICENSE) for terms.
- **Security**: To report a security vulnerability, please follow the coordinated disclosure policy in [`SECURITY.md`](SECURITY.md).
