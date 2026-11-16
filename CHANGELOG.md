# Changelog

All notable changes to `@nairaramp/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **SEP-12 KYC (`src/kyc.ts`)**: `ramp.getKycStatus(options?)` and `ramp.putKyc(options)` supporting SEP-9 text/binary fields, `add`/`update` routing, and `KYC_REQUIRED` mapping.
- **SEP-6 Non-Interactive Transfers (`src/sep6.ts`)**: `ramp.depositSep6(options)` and `ramp.withdrawSep6(options)` with asset/SEP-6 guards and KYC requirement mapping.
- **SEP-38 Firm Quotes (`src/quotes.ts`)**: `ramp.requestQuote(options)` and `ramp.getQuote(quoteId)` with `FirmQuote`, `RequestQuoteOptions`, and `QUOTE_EXPIRED` error mapping.
- **SEP-24 History & Metadata (`src/ramp.ts`)**: `ramp.getTransactions(options)` and `ramp.getAnchorInfo(options?)`.
- **Mainnet Anchor Registry**: Promoted live-verified Nigerian anchors `ngnc` (`NGNC`) and `cowrie` (`NGNT`) to `src/registry/anchors/`.
- **Contract & Config Extensions (`src/ramp.ts`)**: Exposed `ramp.anchor` metadata, `clientDomain` and `horizonUrl` options on `createRamp`, and `authInFlight` concurrency deduplication in `authenticate()`.
- **Watcher Jitter & Timing Options (`src/watcher.ts`)**: Bounded ±15% polling jitter and configurable `WatchOptions` (`initialDelayMs`, `maxDelayMs`, `jitterRatio`, `random`).
- **Tooling & CI**: Added `test:coverage` script, ignored `coverage/**` in ESLint, and added coverage + `npm pack --dry-run` verification to `.github/workflows/ci.yml`.

### Fixed
- **Withdrawal Asset Resolution (`src/ramp.ts`)**: `resolvePaymentAsset` now strictly validates asset strings and rejects ambiguous missing assets on multi-asset anchors with `NairaRampError("TRANSACTION_FAILED")`.

## [0.1.0] - 2026-11-08

### Added
- Core Ramp client (`createRamp`) integrating SEP-10 web authentication, SEP-24 hosted deposits, SEP-24 hosted withdrawals, and SEP-38 price quotes.
- Anchor Registry (`src/registry/`) with Zod schema validation (`AnchorEntrySchema`, `getAnchor`, `listAnchors`) and registered `sdf-testanchor`.
- Mainnet safety guard (`assertNetworkAllowed`) requiring explicit `allowMainnet: true` opt-in and enforcing a 90-day verification freshness check on anchors.
- Signer adapters:
  - In-memory secret key signer (`keypairSigner`).
  - Freighter browser extension adapter (`freighterSigner`).
  - Stellar Wallets Kit adapter (`walletsKitSigner`).
- Transaction watcher (`watchTransaction` and `ramp.watch`) with polling, exponential backoff, jitter, and terminal status callbacks.
- Complete withdrawal submission (`ramp.completeWithdrawal`) handling text, id, and base64 hash memos with Horizon fee stats fallback.
- Unified typed error hierarchy (`NairaRampError`, `isNairaRampError`) and standardized error codes (`NairaRampErrorCode`).
- Research report on Nigerian Stellar anchors (`docs/anchors-nigeria.md`) and draft definitions for mainnet anchors (`src/registry/drafts/`).
- Full TypeScript type definitions (`dist/index.d.ts`, `dist/index.d.cts`) and comprehensive API documentation (`docs/API.md`).

