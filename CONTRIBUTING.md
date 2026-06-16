# Contributing

## Development setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your Google OAuth credentials (see [Setup](README.md#setup) for how to get these)
4. `npm run build` to compile
5. `npm run test:integration` to verify against live API

## Adding a new tool

1. Create a file in the appropriate `src/tools/<category>/` directory
2. Export a `register*` function that takes `(server: McpServer, client: FormsClient)`
3. Use Zod for input validation with `.describe()` on every field
4. Include tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`)
5. Import and call it from the category's `index.ts`
6. Add an integration test in `tests/integration/`

## Tool naming

- Use `snake_case` for tool names (MCP spec convention)
- Verb-noun pattern: `create_form`, `add_question`, `list_responses`
- Composite tools can use broader names: `build_form`, `export_responses_csv`

## Testing

Tests use [vitest](https://vitest.dev/). Two modes:

- `npm test` runs unit tests (no credentials needed)
- `npm run test:integration` runs integration tests against the live Google Forms API (requires `.env` with valid OAuth credentials)

Integration tests create temporary forms and delete them via the Drive API afterwards. Each test file should create its own form and not depend on state from other test files.

**Note:** CI only runs type-checking (`tsc --noEmit`) on pull requests. Integration tests run on push to `main` (where secrets are available). Run integration tests locally before submitting a PR.

## Code style

No linter is configured. Match the style of surrounding code. The project uses:
- TypeScript strict mode
- ES modules (`import`/`export`)
- No semicolons are fine; existing code uses them

## Pull requests

- Branch off `main`
- One feature per PR
- Include integration tests for new tools
- Ensure `npx tsc --noEmit` passes with no errors
- Run `npm run test:integration` locally before submitting
