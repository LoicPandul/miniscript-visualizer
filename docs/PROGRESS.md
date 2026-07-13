# Progress

Working notes on where the project stands. Newest first.

## 2026-07-13 — Light theme redesign (user feedback pass)

- Single light theme: warm paper background, white cards, darkened type/participant palettes (WCAG AA kept).
- Diagram now lays out left-to-right (root on the left) — more compact vertically, outputs visible without scrolling.
- Removed: annotations/notes, minimap, dotted canvas background, "Compiles/sane/non-malleable" badges (errors and warnings still surface, only when present).
- Disclaimer moved to a visible band at the top of the builder sidebar.
- Examples: HTLC removed; added 3-of-5 multisig and "Multisig + recovery key"; decaying multisig description clarified (semantics verified: thresh(3, A, B, C, older) is the standard pattern).
- Header compacted to a single row; AND/OR icons now pure logic wedge/vee (∧/∨); native select options given explicit colors (white-on-white dropdown fix).
- Store: annotations removed, persist version bumped to 2.
- 73 unit + 29 e2e tests green after the redesign.

## 2026-07-13 — Review pass, accessibility, hardening

Dedicated review of the whole codebase, findings fixed:

- Canvas: batch-resolved selection changes (a stale closure could cancel a fresh selection), root node can no longer be deleted from the diagram, PNG export capped under Safari canvas limits with a failure message.
- Store: participants are no longer silently pruned by unrelated tree edits (unused keys stay, dimmed, removable by hand); diagram positions and selection are cleaned up when nodes disappear; ids carry per-session entropy so persisted state can never collide.
- Compile pipeline: previous output stays visible while recompiling (no flicker), compiler load failures surface an error instead of an endless spinner.
- Validation: thresholds satisfiable without any key now warn; script keywords are rejected as key aliases; the parser rejects zero weights.
- Accessibility: WCAG 2.1 AA clean (axe, desktop + mobile), focus trap + focus restore in the import dialog, arrow-key navigation on radio groups and menus, roving tabindex.
- UI: educational disclaimer under the outputs, `duplicate keys` badge, custom logo + favicon.
- Suite now at 73 unit tests + 29 e2e (fresh production build each run).

## 2026-07-13 — Full UI, diagram, outputs, e2e suite

- Zustand store (localStorage persistence) + always-valid tree operations; fixed a spare-participant reuse bug (transform key→thresh now creates distinct keys).
- Builder panel: recursive colored node cards, type transform select, threshold stepper, OR spend-odds, absolute (height/date) and relative (blocks/duration) timelock editors, hash locks with random digest, participant chips (rename/add/remove).
- Interactive diagram (React Flow): tidy auto-layout (d3-hierarchy), 1:1 node drag with committed positions, dashed edges for alternative branches, annotations (add/edit/drag/delete), minimap, PNG export, fit view, auto-layout reset.
- Outputs: Policy / Miniscript / Descriptor / Bitcoin script (ASM), colorized to match node & participant colors, one-click copy, compile status chip + sanity/malleability badges, node-anchored issues.
- Header: script context (P2WSH / P2SH-P2WSH / P2TR), examples menu, policy import dialog, reset, GitHub link.
- Mobile: bottom tab bar (Build / Diagram / Code); panels kept mounted off-screen so React Flow keeps its dimensions.
- Tests: 67 unit (vitest) + 27 e2e (Playwright, desktop Chrome + Pixel 7, against the production build). All green.

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
