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
