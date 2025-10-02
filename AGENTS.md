# Agent Guidelines for osmium-stratos

This document outlines the conventions and commands for agentic coding in this repository.

## 1. Build/Lint/Test Commands

*   **Build:** The primary application is started via `npm start` (`node index.js`). Frontend assets are likely handled by Vite (see `vite.config.js`), but no explicit build script is defined in `package.json`.
*   **Lint:** No dedicated linting configuration (e.g., `eslint.config.js`) was found.
*   **Test:** No test command is specified in `package.json`. There is no standard way to run tests, including single tests.

## 2. Code Style Guidelines

Since no explicit style configuration files were found, agents should infer code style from the existing codebase.

*   **Imports:** Follow existing import patterns (e.g., relative paths, absolute paths).
*   **Formatting:** Maintain consistent indentation, brace style, and spacing as observed in surrounding code.
*   **Types:** This project uses JavaScript; type annotations are not present.
*   **Naming Conventions:** Adhere to existing naming conventions (e.g., `camelCase` for variables/functions, `PascalCase` for components/classes).
*   **Error Handling:** Observe and replicate existing error handling patterns (e.g., `try-catch` blocks, error propagation).

## 3. AI Assistant Rules

No specific Cursor or Copilot rule files were found in `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`.