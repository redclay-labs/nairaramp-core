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

