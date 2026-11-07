# AGENTS.md - nairaramp-core

## Project

nairaramp-core publishes the npm package @nairaramp/core: a TypeScript
SDK that adds Pay with Naira and Cash Out to Naira flows to Stellar apps
through Stellar anchors. Single package at the repository root.

## Core constraint

Build on @stellar/typescript-wallet-sdk. NEVER reimplement SEP-1, SEP-6,
SEP-10, SEP-12, SEP-24 or SEP-38. A hand-built SEP-10 challenge or SEP-24
HTTP call is a defect: replace it with the Wallet SDK call.

## Scope boundary

This repository owns only @nairaramp/core. It does NOT own React hooks or
components (repository nairaramp-react) or the demo app and quickstart
(repository nairaramp-demo). Never add React, JSX or Next.js code here.
If a step seems to need a change in another repository, write it to
docs/UPSTREAM-REQUESTS.md and stop with STEP <n> BLOCKED.
Every public function throws only NairaRampError once src/errors.ts exists.

## Hard rules

1. Work only on the step you were given. Never start the next step.
2. Build only what the step specifies: no extra features, files,
packages, options or refactors. When something is unspecified, pick
the smallest option that meets the requirement and log it in
docs/DECISIONS.md.
3. Never use an SDK, CLI or library API from memory. Read the installed
type definitions (node_modules), crate source (~/.cargo/registry) or
`<command> --help` first. If a step names an API that does not exist
in the installed version, use the real equivalent and log the mapping
in docs/DECISIONS.md.
4. Never add a dependency the step does not name. Ask me first.
5. Pin exact versions. Keep VERSIONS.md current (name, version, date).
6. Never commit secrets or print secret keys. .env files are git-ignored;
commit .env.example with placeholders only.
7. Write tests in the same step as the code. Never delete, skip or weaken
a test, lint rule or type check to get green.
8. Run every command non-interactively (--yes, CI=1, explicit flags). If
a command waits for input, stop it and find the flag.
9. Never run git add, git commit or git push during a build step. Git
actions happen only when I send a "Commit and push" prompt.
10. Never claim something works unless you ran it in this session and saw
it pass. Report real output, including failures.
11. If the network is unreachable, finish the offline work, mark network
checks "pending" in docs/PROGRESS.md, and report BLOCKED with the
exact commands I should run.
12. Never create, edit or delete files outside this repository folder,
including sibling repositories that sit next to it on disk.

## Commit and push prompts

When executing a commit and push:
1. Scope safeguard: Run `git status` first. Verify strictly that only files within the step's scope are modified or untracked. Stop immediately if any file outside scope, `.env` file, secret, credential, `node_modules`, `target/`, or unexpected build output is present.
2. Branch safeguard: Run `git branch --show-current` to confirm the active branch is `main`. Never blindly push without confirming the target branch.
3. Stage files: Run `git add -A` (or stage specific in-scope files) only after scope verification passes.
4. Commit: Run `git commit -m "<message>"` with a clear, descriptive message (or the exact message provided).
5. Push: Run `git push origin main`. Never force push, amend pushed commits, rebase, change git config, or change remotes. If rejected, stop and show the error.
6. Verify & Report: Inspect the commit hash and verify push output. Report the commit hash, commit message, push output, and verification result. Last line: PUSHED <n>

## End of every build step

Append to docs/PROGRESS.md: date, step number, what was built, commands
run with results, open issues. Then reply with these sections: Summary /
Commands run and results / Files changed / Decisions logged / Open
issues. The last line must be exactly one of:
STEP <n> DONE
STEP <n> BLOCKED: <one-line reason>

## Commands

pnpm build | pnpm lint | pnpm typecheck | pnpm test |
pnpm test:integration (testnet; needs network)

