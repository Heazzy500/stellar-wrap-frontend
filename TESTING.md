# Testing Guide

This document provides information about running and maintaining tests for the Stellar Wrap project.

## Lighthouse CI (Performance & Quality)

We use [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) to track Performance, Accessibility, Best Practices, and SEO scores on every pull request.

### Score Thresholds

| Category | Minimum Score | Enforcement |
|----------|-------------|-------------|
| Performance | 70 | Hard fail (PR blocked) |
| Accessibility | 85 | Hard fail (PR blocked) |
| Best Practices | 90 | Hard fail (PR blocked) |
| SEO | 80 | Hard fail (PR blocked) |

### Running Lighthouse Locally

Useful for debugging performance regressions before opening a PR:

```bash
# 1. Install dependencies (if not already done)
yarn install

# 2. Build the production app
yarn build

# 3. Run Lighthouse CI against the local production server
yarn lhci:local

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Type Checking

Run the TypeScript compiler in `--noEmit` mode to catch type errors without emitting build output:

```bash
pnpm typecheck
```

This runs automatically in CI on every pull request.

## Test Infrastructure

### Framework

- **Jest** - JavaScript testing framework
- **TypeScript** - Type-safe test code
- **Next.js Jest Integration** - Configured for Next.js 16

### Configuration

- `jest.config.js` - Main Jest configuration
- `jest.setup.js` - Global test setup and utilities

## Test Structure

```
src/services/
├── indexer/
│   ├── __tests__/
│   │   └── indexer.service.test.ts
│   └── types.ts
├── achievement/
│   ├── __tests__/
│   │   └── achievement-calculator.test.ts
│   └── types.ts
└── __tests__/
    ├── test-utils.ts
    ├── fixtures.ts
    └── README.md
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

Watch mode automatically re-runs tests when files change:

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npm test -- indexer.service.test.ts
```

### Run Tests Matching a Pattern

```bash
npm test -- --testNamePattern="calculateVolume"
```

### Run Share Card Visual Regression Tests

Share card screenshots are tested with Playwright at the card's native
`1080x1080` resolution. The suite covers all five color themes, short and long
persona names, transaction counts of `1`, `100`, and `999,999`, and missing
archetype/vibe data.

```bash
# Run visual comparisons against committed baselines
npm run test:visual

# Update baselines after an intentional ShareImageCard visual change
npm run test:visual:update
```

Review the generated image changes before committing updated baselines. Visual
tests fail when the screenshot diff exceeds `0.1%`.

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view the detailed report.

## Test Coverage Goals

- **Target**: 80%+ coverage for all services
- **Areas to Cover**:
  - All public methods
  - Edge cases
  - Error handling
  - Boundary conditions
  - Integration scenarios

## Writing Tests

### Test File Structure

```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Using Test Utilities

```typescript
import { createMockTransaction } from '../__tests__/test-utils';
import { XLM_PAYMENT_TRANSACTIONS } from '../__tests__/fixtures';

// Use utilities to create test data
const transaction = createMockTransaction({ hash: '0x123' });

// Use fixtures for common scenarios
const result = service.processTransactions(XLM_PAYMENT_TRANSACTIONS);
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear sections
4. **Edge Cases**: Test boundary conditions and error cases
5. **Mocking**: Use mocks for external dependencies
6. **Fixtures**: Reuse test data fixtures when possible

## Test Categories

### Unit Tests

Test individual functions and methods in isolation.

**Location**: `src/services/**/__tests__/*.test.ts`

### Integration Tests

Test how multiple components work together.

**Location**: `src/services/**/__tests__/*.integration.test.ts` (to be added)

## Continuous Integration

Tests should run automatically in CI/CD pipelines. Ensure:

1. Tests pass before merging PRs
2. Coverage thresholds are maintained
3. All new code includes corresponding tests

## Troubleshooting

### Tests Not Running

- Ensure dependencies are installed: `npm install`
- Check Jest configuration in `jest.config.js`
- Verify test file naming matches patterns in `jest.config.js`

### Type Errors

- Ensure TypeScript is properly configured
- Check `tsconfig.json` includes test files
- Verify type definitions are imported correctly

### Coverage Issues

- Check `collectCoverageFrom` in `jest.config.js`
- Ensure test files are not included in coverage
- Verify coverage thresholds are realistic

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [TypeScript Testing](https://jestjs.io/docs/getting-started#using-typescript)

## Current Status

⚠️ **Note**: The indexer and achievement calculator services are not yet implemented (blocked by issues #34 and #40). The test files are written in a TDD approach and will validate the services once they are implemented.

To make tests pass:
1. Implement the indexer service (issue #34)
2. Implement the achievement calculator service (issue #40)
3. Initialize services in test `beforeEach` hooks
4. Remove placeholder comments and TODOs
