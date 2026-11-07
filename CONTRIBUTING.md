# Contributing to @nairaramp/core

## About @nairaramp/core

`@nairaramp/core` is a TypeScript SDK that adds Pay with Naira and Cash Out to Naira flows to Stellar apps through Stellar anchors. It provides a typed, developer-friendly interface for integrating Naira fiat on- and off-ramps on Stellar.

Core constraint: `@nairaramp/core` builds directly on `@stellar/typescript-wallet-sdk` and NEVER reimplements SEP-1, SEP-6, SEP-10, SEP-12, SEP-24, or SEP-38 protocols.

## Setup

Requirements: Node 20+ and pnpm 9 via corepack.

Clone the repository:
```bash
git clone https://github.com/redclay-labs/nairaramp-core.git
cd nairaramp-core
```

Install dependencies:
```bash
pnpm install
```

Build the package:
```bash
pnpm build
```

Run unit tests:
```bash
pnpm test
```

## Testnet Tests

To run integration tests against the Stellar testnet:
```bash
pnpm test:integration
```

Set `RUN_INTERACTIVE=1` to enable tests that require an interactive browser step:
```bash
RUN_INTERACTIVE=1 pnpm test:integration
```

## Scope

This repository strictly contains only the core `@nairaramp/core` TypeScript SDK. React components and hooks live in `nairaramp-react`, and the demo application lives in `nairaramp-demo`. Pull requests that add React, JSX, or Next.js code here will be closed.

## Branch Naming & Pull Requests

- Branch naming convention: `issue-<number>-<short-name>` (for example, `issue-42-quote-ttl`).
- Exactly one issue per pull request.
- Include `Closes #<number>` in the pull request description to automatically link and close the corresponding issue upon merge.

## Stellar Wave

This repository takes part in the Stellar Wave program on Drips. Maintainers add issues in the Drips Wave app, and the Drips Wave bot labels them "Stellar Wave".

During an active Wave (usually one week each month), contributors sign in at [drips.network/wave](https://drips.network/wave) with GitHub and apply to an issue; the maintainer assigns one applicant. Merged work earns points by complexity:
- **Trivial:** 100 points
- **Medium:** 150 points
- **High:** 200 points

Rewards are shared by points after the Wave. For full details on the program, see the documentation at [https://docs.drips.network/wave](https://docs.drips.network/wave).

## Code Rules

- **No unauthorized dependencies:** Never add a new dependency without prior discussion and approval in the issue.
- **Tests required:** Comprehensive tests must accompany all new code and bug fixes.
- **Pre-PR verification:** Always run linting, type-checking, and tests locally before opening a pull request:
```bash
pnpm lint
pnpm typecheck
pnpm test
```
