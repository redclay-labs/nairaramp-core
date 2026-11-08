# @nairaramp/core

[![npm version](https://img.shields.io/npm/v/@nairaramp/core.svg)](https://www.npmjs.com/package/@nairaramp/core)
[![Release](https://img.shields.io/github/v/tag/redclay-labs/nairaramp-core?label=release)](https://github.com/redclay-labs/nairaramp-core/releases/tag/v0.1.0)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

A TypeScript SDK that adds Pay with Naira and Cash Out to Naira flows to Stellar applications through Stellar anchors. Published on npm at [`@nairaramp/core@0.1.0`](https://www.npmjs.com/package/@nairaramp/core) with git tag [`v0.1.0`](https://github.com/redclay-labs/nairaramp-core/releases/tag/v0.1.0).

## Notice

> **Testnet Only:** Mainnet access is disabled by default. Mainnet anchor interactions require explicit opt-in (`allowMainnet: true`) and pass automatic safety verification freshness checks.

---

## Release Status (`v0.1.0`)

`@nairaramp/core` is officially published on npm and tagged on GitHub:
- **NPM Package**: [`@nairaramp/core`](https://www.npmjs.com/package/@nairaramp/core) (version `0.1.0`)
- **Git Tag**: [`v0.1.0`](https://github.com/redclay-labs/nairaramp-core/tree/v0.1.0)
- **Runtime**: Node.js `>= 20`, modern browsers, and ESM/CommonJS bundlers
- **Artifacts**: ESM (`dist/index.js`), CommonJS (`dist/index.cjs`), and TypeScript declarations (`dist/index.d.ts`, `dist/index.d.cts`)

Verify live package version via npm CLI:
```bash
npm view @nairaramp/core version
# 0.1.0
```

---

## Features & Implementation Overview

`@nairaramp/core` is built directly on top of `@stellar/typescript-wallet-sdk` and `@stellar/stellar-sdk` without reimplementing any Stellar Ecosystem Proposals (SEPs).

- **SEP-10 Web Authentication**: Automatic challenge retrieval, signer bridging, signature submission, in-memory JWT caching, and near-expiry token refreshing.
- **SEP-24 Hosted Deposit & Withdrawal**: Initiate interactive fiat deposit and withdrawal flows with upfront asset validation and error mapping.
- **SEP-24 Withdrawal Fulfillment (`completeWithdrawal`)**: Automatically queries pending transactions, decodes text/id/base64-hash withdrawal memos, loads source accounts, fetches network fee stats from Horizon, and signs/submits payments.
- **SEP-38 Price Quotes (`ramp.getPrice`)**: Query real-time indicative conversion rates for asset pairs with strict parameter validation and error translation.
- **Pluggable Signers**:
  - `keypairSigner`: In-memory secret key signer for backend/CLI testing.
  - `freighterSigner`: Browser extension signer via `@stellar/freighter-api`.
  - `walletsKitSigner`: Multi-wallet signer via `@creit.tech/stellar-wallets-kit` (Albedo, xBull, Hana, Rabet, etc.).
- **Transaction Watcher (`ramp.watch`)**: Polling-based state watcher featuring sequential execution (no overlapping polls), exponential backoff, jitter, and terminal status callbacks.
- **Mainnet Safety Guard**: Runtime guard asserting network matching, requiring explicit `allowMainnet: true` opt-in, and enforcing a 90-day verification freshness check on anchors.
- **Nigerian Anchors Research**: Empirical network audit documenting verified Nigerian anchors (`ngnc.online`, `cowrie.exchange`) with live mainnet drafts in `src/registry/drafts/`.
- **Unified Error Handling**: Strict typed errors via `NairaRampError` and `isNairaRampError` covering auth, unreachable anchors, quote expiration, and signer rejections.

---

## Installation

Install the published package from the npm registry:

```bash
# pnpm
pnpm add @nairaramp/core

# npm
npm install @nairaramp/core

# yarn
yarn add @nairaramp/core
```

---

## Quick Example

```typescript
import { createRamp, keypairSigner } from "@nairaramp/core";

const ramp = createRamp({
  network: "testnet",
  anchorId: "sdf-testanchor",
  signer: keypairSigner("SD4WZX23G7Y7N5F2B5Q23J3S7A66GJJ244M37DGBM5X57Q4X5H62K22L"),
});

const { id, url } = await ramp.deposit({ assetCode: "SRT" });
console.log("Hosted deposit flow URL:", url);

const sub = ramp.watch(id, {
  onStatus: (status) => console.log("Status:", status),
  onComplete: (tx) => console.log("Deposit completed:", tx.stellar_transaction_id),
});
```

---

## Supported Signers

```typescript
// 1. Keypair Signer (secret key)
import { keypairSigner } from "@nairaramp/core";
const signer = keypairSigner("S...");

// 2. Freighter Browser Extension
import { freighterSigner } from "@nairaramp/core";
const signer = freighterSigner();

// 3. Stellar Wallets Kit
import { walletsKitSigner } from "@nairaramp/core";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
const kit = new StellarWalletsKit({ ... });
const signer = walletsKitSigner(kit);
```

---

## Development & Testing

```bash
# Install dependencies
pnpm install

# Build ESM, CJS, and TypeScript declarations
pnpm build

# Run linting and type checking
pnpm lint
pnpm typecheck

# Run unit tests (110 tests across 10 suites)
pnpm test

# Run live Stellar testnet integration tests (requires network)
pnpm test:integration
```

---

## Documentation

- [API Reference](docs/API.md)
- [Nigerian Stellar Anchors Research](docs/anchors-nigeria.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Seed Issues for Contributors](docs/seed-issues.md)
- [Changelog](CHANGELOG.md)

Related repositories: nairaramp-react, nairaramp-demo
