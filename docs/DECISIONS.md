# Decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-07 | Linter: ESLint flat config with typescript-eslint | CI needs a lint step |
| 2026-11-07 | Registry validation: zod | Typed schema that also validates at runtime |
| 2026-11-07 | Mainnet freshness window: verifiedAt within 90 days | "Recent" needed a number |
| 2026-11-07 | Testnet tests run only with RUN_INTEGRATION=1 | Network calls make PR CI flaky |
| 2026-11-07 | Keypair signer ships with createRamp | SEP-10 tests need a signer early |
| 2026-11-07 | GitHub owner: redclay-labs | Origin remote points to github.com/redclay-labs/nairaramp-core |
| 2026-11-07 | Explicit commit/push safeguards | Added explicit branch safeguard and scope verification steps to AGENTS.md |
| 2026-11-07 | Pinned TypeScript to 5.8.3 | typescript-eslint 8.72.1 requires peer typescript < 6.1.0 |
| 2026-11-07 | Vitest 60s timeout configured via test.projects | Vitest 5 deprecated test.workspace in favor of test.projects |
| 2026-11-07 | Pinned pnpm packageManager to 9.15.9 | Matches installed pnpm 9 version |
| 2026-11-07 | GitHub Actions: checkout@v7, setup-node@v7, pnpm/action-setup@v6 | Current major versions per official GitHub repositories |
| 2026-11-07 | Pinned zod to 4.6.7 | Latest stable runtime schema validation dependency |
| 2026-11-07 | Await async client signing in sep10.sign wrapper | @stellar/typescript-wallet-sdk 6.0.0 signWithClientAccount is synchronous |
| 2026-11-07 | Slice new signatures on transaction | TransactionBuilder.fromXDR includes original challenge server signature |
| 2026-11-07 | Pinned @stellar/freighter-api to 6.0.1 | Official npm package for Freighter wallet integration |
| 2026-11-07 | Pinned @creit.tech/stellar-wallets-kit to 2.8.0 | Official npm package from Creit-Tech for Stellar Wallets Kit |
| 2026-11-07 | AnchorTransaction derived via Pick from Types.DepositTransaction & Types.WithdrawTransaction | Union type Types.AnchorTransaction distributes in Pick, intersection provides all 9 target fields |
| 2026-11-07 | Pass optional amount in Sep24PostParams via extraFields | Wallet SDK Sep24 deposit method accepts extraFields: { amount } |
| 2026-11-07 | Watcher backoff: setTimeout chains with Math.min(delay * 1.5, 30000) | Satisfies sequential polling, no overlapping polls, and clean timer teardown |
| 2026-11-07 | Withdrawal transfer payment built via @stellar/stellar-sdk | Wallet SDK transferWithdrawalTransaction rejects missing memo with WithdrawalTxMissingMemoError; stellar-sdk cleanly supports missing memos, 180s timeout, fee stats fallback, and Signer bridging |
| 2026-11-08 | SEP-38 price context defaults to "sep6" | Wallet SDK Sep38PriceParams requires context (Sep38PriceContext); getPrice accepts optional context and defaults to "sep6", supported by SEP-38 anchors including sdf-testanchor |
| 2026-11-08 | Step 16 Nigerian anchor drafts | Discovered NGNC (ngnc.online) via Horizon and Cowrie (cowrie.exchange) via ezedike-evan/corridor-in-a-box. Stored draft definitions in src/registry/drafts/ with network "mainnet", isolated from production registry index |
| 2026-11-08 | Step 17 release preparation 0.1.0 | Updated package.json and src/index.ts to 0.1.0; verified npm pack tarball contains strictly dist/, README.md, LICENSE, and package.json; verified temporary external npm install import |
| 2026-11-08 | Step 18 Seed issues & coverage | Added @vitest/coverage-v8@5.1.0 matching vitest 5.1.0; created 9 seed issues (3 Trivial, 4 Medium, 2 High) drawn exclusively from real codebase gaps, coverage branch findings, unverified anchors, and planned SEP extensions |
| 2026-11-09 | Upstream back-links (Step U1) | Replaced plain-text related repositories in README.md with upstream links to redclay-labs/nairaramp-react, redclay-labs/nairaramp-demo, https://nairaramp-demo.vercel.app, and demo quickstart |
