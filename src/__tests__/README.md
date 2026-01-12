# Test Coverage Notes

## Tested Files (29 tests)

- **logger.test.ts** (5 tests) - 90.9% coverage
- **theme-manager.test.ts** (7 tests) - 68.4% coverage
- **slide-navigator.test.ts** (7 tests) - 70.7% coverage
- **file-watcher.test.ts** (5 tests) - 60% coverage (mocked)
- **input-handler.test.ts** (5 tests) - Basic interface only

## Files Not Tested

**presenter.ts** - Main controller that orchestrates all components. Testing would require mocking too many dependencies.

**markdown-renderer.ts** - Has ESM import chain (string-width → strip-ansi). Testing causes Jest issues.

**terminal-utils.ts** - ESM imports prevent proper testing in Jest environment.

**async-initializer.ts** - Complex async initialization that's difficult to test properly.

**checksum-validator.ts** - Would require creating files with specific checksums.