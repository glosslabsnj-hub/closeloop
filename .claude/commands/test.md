Run and manage tests for: $ARGUMENTS

**Test setup:**
- Framework: Vitest with jsdom environment
- Config: `vitest.config.ts`
- Test location: `tests/` directory and co-located `*.test.ts` files
- Run all: `npm run test`
- Watch mode: `npm run test:watch`
- Run specific: `npx vitest run <pattern>`

**When writing new tests:**
- Follow existing test patterns in `tests/`
- Use `@testing-library/react` for component tests
- Use `@testing-library/jest-dom` matchers
- Mock Supabase client for DB-dependent tests
- Test deterministic routing logic thoroughly (intent x enabled_modules)
- Test edge cases: null handling, missing tenant, disabled modules

**When debugging failing tests:**
1. Run the specific failing test with verbose output
2. Read the test file and the source it tests
3. Identify the mismatch between expected and actual behavior
4. Fix the source or update the test (ask if unclear which)
