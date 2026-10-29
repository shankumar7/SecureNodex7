# Contributing

## Git workflow (repo: https://github.com/shankumar7/SecureNodex7)
- `main` is always demo-able. Branch per milestone/module: `m4/storage-layer`, `fix/revocation-latency`.
- Conventional commits: `feat(storage): chunk placement with HRW`, `fix(gateway): reject replayed seq`, `docs: ...`, `test: ...`.
- Small, frequent commits. Open a PR per branch; one teammate reviews; squash-merge.
- Security-critical code (cert validation, signature verification, ACLs, key handling, storage integrity checks) requires review by the Security owner.

## Secrets
Never commit keys, `.env`, wallets, root CA. Run `gitleaks` locally before pushing. If a secret leaks: rotate it immediately and rewrite history.

## Working with Antigravity
1. Start every session with the master prompt (ANTIGRAVITY_PROMPT.md section 1).
2. Give **one milestone prompt** at a time.
3. Require tests first or alongside code; ask it to run them and paste results.
4. If the agent wants to deviate from a spec, it writes `docs/adr/NNNN-title.md` and a note in `docs/QUESTIONS.md`; humans decide.
5. Review diffs yourselves for crypto/ACL logic. Do not accept "it should work" - demand a passing test.

## Code standards
Python 3.12, type hints, ruff, mypy (strict for `crypto`, `storage`, `identity`), pytest. TypeScript strict, eslint. Solidity: solhint, NatSpec comments, no floating pragma in deployed contracts. Structured JSON logs with correlation id. No `print`.

## ADRs
`docs/adr/NNNN-title.md`: Context, Decision, Consequences. Needed for: chain-write model, audit batching, broker auth plugin choice, any change to message format or manifest schema.
