# Progress

Working notes on where the project stands. Newest first.

## 2026-07-13 — Core domain + compiler integration

- Policy AST (`src/core/policy.ts`): keys, AND, OR (with weights), thresholds, absolute/relative timelocks, hash locks. Trees are kept always-valid by construction.
- Serializer with per-node tokens (for colorized output), n-ary AND/OR desugared to nested binary.
- Policy-language parser (paste a policy, get the tree back).
- Timelock helpers: height/date for `after`, blocks/512s-units for `older`, human descriptions.
- Structural validation with node-anchored errors and warnings.
- Compiler wrapper around `@bitcoinerlab/miniscript-policies` (reference sipa compiler, wasm2js) + `@bitcoinerlab/miniscript` (analysis). Contexts: P2WSH, P2SH-P2WSH, P2TR (`compilePolicyTaproot`). Lazy-loaded.
- 48 unit tests passing (serialize, parse, timelocks, validate, compile).

Notable findings:
- The compiler hard-rejects non-sane policies (`[compile error]`, no detail) — our own validation messages explain the "why" in the UI.
- Key aliases are limited to 17 characters by the compiler.
- bitcoindevkit.org repo has **no license** → we reuse none of their code; everything here is original. MIT for this repo, courtesy credit to BDK in the README.

## Next

- Zustand store + design tokens.
- Builder UI, interactive diagram (React Flow), output blocks.
- Playwright e2e, README, deploy docs.
