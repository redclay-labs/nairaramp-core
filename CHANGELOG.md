# Changelog

All notable changes to `@nairaramp/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

