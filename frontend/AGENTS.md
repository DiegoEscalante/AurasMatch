This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Mandatory Project Rules & SDD Reference (Read First)

Before proposing or writing any code, **ALWAYS read `../docs/specs/00-overview-and-rules.md`** and contrast every decision against the **three mandatory project documents** in `../docs/projectProposalDocs/` (`Course Project Phase 3 - Entrega Final (Proyecto Final Desarrollo Móvil).md`, `Project Proposal.pdf`, and `2ndPhaseProposal.pdf`):
1. **Never assume technical decisions:** Always ask the user first. Whenever asking a question, ALWAYS provide a detailed explanation in the response text explaining: (a) **WHY this decision needs to be made** (what problem or requirement triggers it), (b) how each option works and its pros/cons, and (c) which option is recommended and why.
2. **Guardrail against the 3 official project rules:** If any user idea contradicts or omits requirements from the professor's rubric (`Course Project Phase 3`) or the Phase 1/2 proposals (`Project Proposal.pdf` and `2ndPhaseProposal.pdf`), warn the user explicitly before acting (the user has the final word). Note: `../docs/projectProposalDocs/agente-desarrollo-movil.md` is **NOT** a mandatory rule for code/architecture decisions; it is only a reference of the topics seen in class to calibrate explanations in documentation.
3. **Mandatory Phase Documentation & Step-by-Step Testing Guide (`docs/phases/README-fase-XX.md` & `docs/CONCEPTOS_Y_DEFINICIONES.md`):** Before closing any phase, create its deep technical walkthrough in `../docs/phases/README-fase-XX.md` and update `../docs/CONCEPTOS_Y_DEFINICIONES.md` (going from general to specific concepts, assuming the baseline knowledge in `agente-desarrollo-movil.md` while still explaining critical concepts thoroughly). **Every phase (both in `README-fase-XX.md` and in the chat presentation) MUST include a clear, step-by-step guide explaining how the user can test and verify all implementations of that phase.**
4. **Commit & push per completed phase:** Only commit and push to the repository once the user explicitly approves and marks the current SDD phase as completed (and update the Phase Progress Checklist in `00-overview-and-rules.md`).
5. **Compact & Stitch-Ready code:** Keep business logic and state inside custom hooks (`React Context` under the hood) and keep UI components clean, minimal, and free of unnecessary decorative bloat so Google Stitch styles can be applied later without breaking functionality.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
