# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MakingStore is a Tauri-based desktop application for managing Codex (Claude Code) prompts, projects, and MCP (Model Context Protocol) services. Built with React + TypeScript frontend and Rust backend.

## Development Commands

### Frontend Development
```bash
npm run dev                 # Start Vite dev server (port 5175)
npm run build              # Build frontend (TypeScript + Vite)
npm run lint               # Run ESLint
npm run preview            # Preview production build
```

### Tauri Development
```bash
npm run tauri:dev          # Start Tauri app in development mode
npm run tauri:build        # Build production Tauri app
```

Note: The project uses `bun` as the package manager (see README.md).

## Architecture

### Frontend (src/)

**Route Structure:**
- Simple client-side routing using path matching in `App.tsx`
- Routes defined in `src/routes/index.tsx`
- Main routes: Dashboard, Codex Management, Claude Code Management, MCP Management, Settings

**Key Pages:**
- `CodexManagement`: Manages Codex CLI installation, projects, and custom prompts
- `MCPManagement`: Manages MakingMcp.Web.exe process lifecycle with environment variables
- `ClaudeCodeManagement`: Claude Code-specific features
- `Dashboard`: Overview and quick actions

**State Management:**
- React hooks (useState, useEffect) for component state
- IndexedDB for client-side persistence (`src/lib/indexedDB.ts`)
- Tauri filesystem operations for ~/.codex and ~/.claude directories

**File System Layer:**
- `tauriFileSystemManager` (`src/lib/tauriFileSystem.ts`): Manages ~/.codex and ~/.claude directories
- `projectsDB` (`src/lib/projectsDB.ts`): IndexedDB wrapper for project persistence
- `customPromptDB` (`src/lib/customPromptDB.ts`): IndexedDB wrapper for custom prompts

### Backend (src-tauri/)

**Rust Commands** (defined in `src-tauri/src/lib.rs`):
- `select_folder`: Opens folder picker dialog
- `execute_command`: Executes system commands via cmd/shell
- `open_project_in_terminal`: Opens project in terminal with Codex CLI
- `start_mcp_service`: Starts MakingMcp.Web.exe as hidden process with environment variables
- `stop_mcp_service`: Stops the managed MCP service process
- `get_executable_path`, `check_executable_exists`, `execute_external_tool`: Resource management

**Resource Manager** (`src-tauri/src/resource_manager_fixed.rs`):
- Handles platform-specific executable paths (`resources/bin/{windows|macos|linux}/`)
- Resolves executables in both development and production modes
- Tries multiple path resolution strategies for robustness

**Process Management:**
- MCP service runs as hidden window (CREATE_NO_WINDOW flag on Windows)
- Streams stdout/stderr to frontend via Tauri events (`mcp-log`, `mcp-exit`)
- Tracks process PID in `McpState` for lifecycle management

### Configuration Files

**Tauri Config** (`src-tauri/tauri.conf.json`):
- Product name: "MakingStore"
- Custom window decorations disabled (frameless window)
- Resources bundled from `resources/**/*`
- File system and shell plugins enabled

**TypeScript Config:**
- Path alias `@/*` → `./src/*` (configured in both tsconfig.json and vite.config.ts)
- Strict mode enabled

## Important Implementation Details

### Codex Project Management

Projects store:
- `path`: Working directory path
- `launchMode`: "normal" or "bypass" (affects `--dangerously-bypass-approvals-and-sandbox` flag)
- `environmentVariables`: Multi-line string with `KEY=VALUE` format, parsed before terminal launch

When opening project in terminal:
- Windows: Uses PowerShell with `Start-Process` for new window
- macOS: Uses `osascript` with Terminal.app
- Linux: Tries gnome-terminal, konsole, xterm, x-terminal-emulator

### Custom Prompts (.codex/prompts/)

Prompts stored as Markdown files with frontmatter:
```markdown
---
description: "Prompt description"
category: "general"
tools: "Read, Write, Bash"
---

Prompt content here...
```

Managed via:
- `loadCodexPrompts()`: Parses all .md files from ~/.codex/prompts/
- `saveCodexPrompt()`: Writes .md file and updates config.json
- `deleteCodexPrompt()`: Removes file and updates config

### MCP Service Management

- Executable: `MakingMcp.Web.exe` (from `resources/bin/windows/`)
- Environment variables injected at process startup
- Log streaming via Tauri events for real-time monitoring
- Process status checked via Windows `tasklist` command

## UI Component System

Uses shadcn/ui components with Radix UI primitives:
- Located in `src/components/ui/`
- Tailwind CSS v4 for styling
- Custom layout components in `src/components/layout/`

## File Paths

Always use absolute paths when referencing files. The `@/` alias resolves to `src/` directory.

## Testing & Debugging

- TypeScript compilation: `npm run build` (runs `tsc && vite build`)
- Rust backend logs to console in dev mode
- Frontend debugging via browser DevTools (Tauri opens Chromium webview)
