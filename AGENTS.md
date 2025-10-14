# Repository Guidelines

## Project Structure & Module Organization
The React entry point sits in `src/main.tsx`, with shared UI under `src/components/`, feature hooks in `src/hooks/`, typed contracts in `src/types/`, and route-level views in `src/pages/` and `src/routes/`. Static assets (icons, fonts) belong in `public/` or `src/assets/`. The Tauri backend lives in `src-tauri/`, where `src-tauri/src/` contains Rust commands and `tauri.conf.json` controls packaging metadata.

## Build, Test, and Development Commands
Use npm scripts for all lifecycle tasks:
- `npm run dev` — launches the Vite dev server for the web shell.
- `npm run preview` — serves the production bundle for smoke testing.
- `npm run build` — runs `tsc` type-checking then builds the Vite bundle.
- `npm run lint` — executes ESLint with TypeScript rules and zero warning tolerance.
- `npm run tauri:dev` — starts the Tauri desktop app with hot reload.
- `npm run tauri:build` — produces native installers; confirm signing requirements before distributing.

## Coding Style & Naming Conventions
Follow the ESLint-configured TypeScript style: two-space indentation, trailing commas, and explicit return types on exported functions. Name React components in `PascalCase`, hooks as `useSomething`, utility modules in `camelCase.ts`, and keep file co-location with the feature they serve. Prefer Tailwind utility classes defined in `src/index.css` for styling; wrap shared patterns in `clsx`-backed helpers within `src/lib/` when reuse emerges.

## Testing Guidelines
Automated tests are pending; when adding coverage, bootstrap Vitest and colocate specs beside components as `ComponentName.test.tsx`. Aim for meaningful UI state assertions rather than snapshot churn, and verify file-system integrations via Tauri’s mock plugins. Always run `npm run tauri:dev` to manually validate dialogs, file access, and platform-specific behavior before opening a PR.

## Commit & Pull Request Guidelines
Adhere to Conventional Commits as seen in history (`fix(scope): detail`, `feat: summary`). Keep subjects under 72 characters and focus on intent. Each PR should include: a succinct changelog-style summary, linked issue reference, screenshots or GIFs for UI updates, and notes about platform impacts (Windows/macOS/Linux). Ensure linting and builds succeed locally (`npm run lint`, `npm run build`, `npm run tauri:build`) before requesting review.

## Security & Configuration Tips
Never hard-code secrets; load environment values through Tauri’s secure APIs and `.env` files ignored by Git. Review changes to `tauri.conf.json` and `src-tauri/capabilities/` to ensure only required system permissions ship in release builds.
