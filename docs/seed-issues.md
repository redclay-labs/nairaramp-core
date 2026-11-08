# Seed Issues for Contributors

This directory contains curated seed issues for external contributors, drawn exclusively from real gaps, unverified items, and designed extensions in this repository.

## Issue Index

| # | Title | Complexity | Points | Labels | Body File |
|---|-------|------------|--------|--------|-----------|
| 01 | Add unit test coverage for `listAnchors` filtering by country and network | Trivial | 100 | `test,good first issue` | [`docs/seed-issues/01.md`](docs/seed-issues/01.md) |
| 02 | Add unit test coverage for browser fallback JWT decoding in `src/ramp.ts` | Trivial | 100 | `test,browser` | [`docs/seed-issues/02.md`](docs/seed-issues/02.md) |
| 03 | Document integration test flags and Friendbot testnet workflow in `CONTRIBUTING.md` | Trivial | 100 | `documentation,good first issue` | [`docs/seed-issues/03.md`](docs/seed-issues/03.md) |
| 04 | Promote verified Nigerian mainnet draft anchors to active registry | Medium | 150 | `enhancement,registry` | [`docs/seed-issues/04.md`](docs/seed-issues/04.md) |
| 05 | Surface detailed Horizon result codes in `completeWithdrawal` transaction failures | Medium | 150 | `enhancement,errors` | [`docs/seed-issues/05.md`](docs/seed-issues/05.md) |
| 06 | Add SEP-12 KYC status helper `ramp.getKycStatus()` | Medium | 150 | `enhancement,sep12` | [`docs/seed-issues/06.md`](docs/seed-issues/06.md) |
| 07 | Probe alternate subdomains for unverified Nigerian anchor candidates | Medium | 150 | `research,anchors` | [`docs/seed-issues/07.md`](docs/seed-issues/07.md) |
| 08 | Implement SEP-6 non-interactive deposit flow (`ramp.depositSep6`) | High | 200 | `feature,sep6` | [`docs/seed-issues/08.md`](docs/seed-issues/08.md) |
| 09 | Implement SEP-38 firm quote request (`ramp.requestQuote`) | High | 200 | `feature,sep38` | [`docs/seed-issues/09.md`](docs/seed-issues/09.md) |

## Complexity Breakdown
- **Trivial (100):** 3 issues (Issue 01, 02, 03)
- **Medium (150):** 4 issues (Issue 04, 05, 06, 07)
- **High (200):** 2 issues (Issue 08, 09)
- **Total:** 9 issues (at least 3 Trivial, at least 3 Medium, at most 3 High)

## Creation Commands

```bash
gh issue create --title "Add unit test coverage for listAnchors filtering by country and network" --body-file docs/seed-issues/01.md --label "test,good first issue"
gh issue create --title "Add unit test coverage for browser fallback JWT decoding in src/ramp.ts" --body-file docs/seed-issues/02.md --label "test,browser"
gh issue create --title "Document integration test flags and Friendbot testnet workflow in CONTRIBUTING.md" --body-file docs/seed-issues/03.md --label "documentation,good first issue"
gh issue create --title "Promote verified Nigerian mainnet draft anchors to active registry" --body-file docs/seed-issues/04.md --label "enhancement,registry"
gh issue create --title "Surface detailed Horizon result codes in completeWithdrawal transaction failures" --body-file docs/seed-issues/05.md --label "enhancement,errors"
gh issue create --title "Add SEP-12 KYC status helper ramp.getKycStatus()" --body-file docs/seed-issues/06.md --label "enhancement,sep12"
gh issue create --title "Probe alternate subdomains for unverified Nigerian anchor candidates" --body-file docs/seed-issues/07.md --label "research,anchors"
gh issue create --title "Implement SEP-6 non-interactive deposit flow (ramp.depositSep6)" --body-file docs/seed-issues/08.md --label "feature,sep6"
gh issue create --title "Implement SEP-38 firm quote request (ramp.requestQuote)" --body-file docs/seed-issues/09.md --label "feature,sep38"
```

