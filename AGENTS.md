# Repository Guidelines

## Project Structure & Module Organization
The React client mounts from `src/main.tsx`; shared UI lives in `src/components`, hooks in `src/hooks`, and typed contracts in `src/types`. Feature pages reside in `src/pages` with route shells in `src/routes`. Static assets belong in `public` for top-level access or `src/assets` when bundled. The Tauri backend sits under `src-tauri`, where Rust commands are defined in `src-tauri/src` and packaging details in `tauri.conf.json`.

## Build, Test, and Development Commands
- `npm run dev`: Launches the Vite dev server for rapid iteration.
- `npm run preview`: Serves the production bundle for smoke testing.
- `npm run build`: Runs TypeScript checking and produces the optimized bundle.
- `npm run lint`: Executes ESLint with strict TypeScript rules; resolve every warning.
- `npm run tauri:dev`: Starts the desktop shell with hot reload via Tauri.
- `npm run tauri:build`: Generates platform installers; confirm signing keys before distribution.

## Coding Style & Naming Conventions
Use two-space indentation, trailing commas, and explicit return types for exported symbols. Name components with `PascalCase`, hooks as `useName`, utilities in `camelCase.ts`, and co-locate files with their feature. Favor Tailwind classes defined in `src/index.css`; factor recurring patterns into `clsx` helpers under `src/lib`.

## Testing Guidelines
Vitest is the preferred runner; colocate specs beside sources as `ComponentName.test.tsx`. Focus on meaningful UI states instead of snapshots. For Tauri commands, rely on mock plugins and validate file access flows through `npm run tauri:dev`. Keep coverage pragmatic and update fixtures when contracts change.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix(scope):`, `chore:`) with subjects under 72 characters. Each PR should include a concise changelog summary, linked issue reference, platform notes (Windows/macOS/Linux), and screenshots or GIFs for UI updates. Verify `npm run lint`, `npm run build`, and `npm run tauri:build` before requesting review.

## Security & Configuration Tips
Never commit secrets; load them through Tauri environment APIs and `.env` files excluded from Git. Audit `tauri.conf.json` and `src-tauri/capabilities` when adding system integrations. Limit filesystem and network permissions to the minimum required for the feature at hand.
