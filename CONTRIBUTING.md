# Contributing to Stellar Wrap

Thank you for your interest in contributing to Stellar Wrap! This guide will help you get started with the development workflow, from setting up your environment to submitting your first pull request.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Format](#commit-format)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Project Structure](#project-structure)
- [Need Help?](#need-help)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. Please be constructive, welcoming, and professional in all interactions.

---

## How Can I Contribute?

### 🐛 Reporting Bugs

- Check [existing issues](https://github.com/mathstickz/stellar-wrap-frontend/issues) to avoid duplicates
- Use the bug report template when creating a new issue
- Include steps to reproduce, expected behavior, and actual behavior
- Add screenshots or error messages if applicable

### ✨ Suggesting Features

- Search [existing issues](https://github.com/mathstickz/stellar-wrap-frontend/issues) first
- Use the feature request template
- Clearly describe the problem you're solving and your proposed solution
- Consider the project's scope and roadmap

### 🎯 Picking Up Issues

We label issues to help you find the right starting point:

- **good first issue** - Great for newcomers, well-scoped with clear requirements
- **easy** - Straightforward implementation with minimal complexity
- **medium** - Requires some familiarity with the codebase
- **hard** - Complex changes that may span multiple components

Browse [open issues](https://github.com/mathstickz/stellar-wrap-frontend/issues) and filter by labels to find work that matches your experience level.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **pnpm** >= 9.0.0 (package manager)

### Fork and Clone

1. **Fork the repository** on GitHub:
   - Visit https://github.com/mathstickz/stellar-wrap-frontend
   - Click the "Fork" button in the top-right corner

2. **Clone your fork locally**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/stellar-wrap-frontend.git
   cd stellar-wrap-frontend
   ```

3. **Add the upstream remote** to keep your fork in sync:

   ```bash
   git remote add upstream https://github.com/mathstickz/stellar-wrap-frontend.git
   ```

### Install Dependencies

```bash
pnpm install
```

### Environment Setup

1. **Copy the environment file**:

   ```bash
   cp .env.example .env.local
   ```

2. **Configure required variables** in `.env.local`:

   | Variable | Description | Required |
   |----------|-------------|----------|
   | `NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET` | Soroban contract address on mainnet (56-char, `C...`) | Yes |
   | `NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET` | Soroban contract address on testnet (56-char, `C...`) | Yes |
   | `NEXT_PUBLIC_CONTRACT_ADDRESS` | Legacy fallback if the two above are not set | No |
   | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID for mobile wallet support | No |
   | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible Analytics domain for privacy-friendly tracking | No |

   > **Note**: Contract addresses are loaded per network. The app uses the selected network (mainnet/testnet) to choose the appropriate contract automatically.

### Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action.

The app supports:
- **Demo mode**: Visit `/connect` and use the demo shortcut to test with mock data
- **Wallet connection**: Freighter, Albedo, or WalletConnect (requires browser extension or mobile app)
- **Network switching**: Toggle between mainnet and testnet in the UI

---

## Development Workflow

### Keep Your Fork Updated

Regularly sync your fork with the upstream repository:

```bash
# Fetch the latest changes from upstream
git fetch upstream

# Merge upstream changes into your local main branch
git checkout main
git merge upstream/main

# Push the updated main branch to your fork
git push origin main
```

### Create a Feature Branch

Always work on a dedicated branch for your changes:

```bash
# Create and switch to a new branch
git checkout -b feat/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

Use descriptive branch names that follow the same convention as commits (see [Commit Format](#commit-format)).

### Make Your Changes

- Write clean, readable code following the existing patterns
- Keep changes focused and minimal—one feature or fix per PR
- Update documentation if you change functionality
- Add tests for new features or bug fixes

---

## Commit Format

This project uses **Conventional Commits** for all change lists (CLs). Following this format helps with automated changelog generation and version management.

### Format

```
<type>(<scope>): <short summary in present tense>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: New user-facing feature (UI, flow, interaction)
- **fix**: Bug fix (visual, logic, or integration)
- **refactor**: Code refactor that doesn't change behavior
- **style**: Purely visual changes (spacing, colors, typography) with no behavior change
- **chore**: Tooling, configs, dependency bumps, project plumbing
- **docs**: Documentation only (README, comments)
- **test**: Adding or updating tests only

### Scopes (Suggested)

Use a small, descriptive scope in parentheses to indicate the area you touched:

- **landing**: Landing hero, CTA (`LandingPage`, `page.tsx`)
- **connect**: `/connect` page and wallet flow
- **loading**: `/loading` page and wrap animation
- **vibe-check**: `/vibe-check` page, vibes visualization
- **persona**: `/persona` archetype reveal
- **share**: `/share` page, share card and menus
- **store**: Zustand stores (`wrapStore`, etc.)
- **theme**: `globals.css`, Tailwind theme tokens
- **layout**: `app/layout.tsx`, root shell and providers
- **utils**: Helpers like `walletConnect.ts`

If a scope doesn't fit, you can omit it: `feat: add keyboard shortcuts`.

### Examples

**Single-file feature:**
```
feat(landing): add weekly/monthly/yearly period selector
```

**Cross-page flow change:**
```
feat(flow): wire connect -> loading -> persona with wrap store
```

**Bug fix:**
```
fix(connect): show error when Freighter is missing instead of hanging
```

**Visual tweak:**
```
style(persona): align oracle heading with progress indicator
```

**Tooling / config:**
```
chore(store): introduce canonical wrap store for frontend data
```

### Body and Footers (Optional)

Use the body to add context when needed:

```
feat(share): use canonical wrap data in share card

- read wrap data from useWrapStore
- keep mockData only in loading for now
```

For breaking changes or references:

```
feat(store): consolidate state into wrapStore

BREAKING CHANGE: legacy store exports removed; update imports to useWrapStore.
```

---

## Testing

This project uses multiple testing strategies. All tests should pass before submitting a PR.

### Unit & Integration Tests (Jest)

```bash
# Run all tests
pnpm test

# If you encounter module resolution issues, clean install:
rm -rf node_modules && pnpm install
pnpm test
```

### Unit Tests (Vitest)

```bash
# Run Vitest tests
pnpm vitest

# Run with UI for debugging
pnpm test:ui
```

### End-to-End Tests (Playwright)

```bash
# Run E2E tests headlessly
pnpm test:visual

# Run with interactive UI (recommended for development)
pnpm test:visual:update
```

E2E tests cover the full user journey:
- Manual wallet address entry
- Wallet connection (Freighter/Albedo)
- Loading/indexing progress
- Persona reveal animation
- Share card download

### Linting

```bash
pnpm lint
```

Ensure there are no linting errors before committing.

---

## Submitting a Pull Request

### Before You Submit

- [ ] All tests pass (`pnpm test`, `pnpm vitest`, `pnpm test:visual`)
- [ ] Code is linted (`pnpm lint`)
- [ ] Commits follow the [Conventional Commits](#commit-format) format
- [ ] Documentation is updated if needed
- [ ] Changes are focused and minimal

### Push Your Branch

```bash
git push origin feat/your-feature-name
```

### Create the Pull Request

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out the PR template:
   - **Title**: Use the same format as your commit message
   - **Description**: Explain what, why, and how
   - **Link issues**: Reference any related issues (e.g., "Closes #123")
4. Submit the PR

### Code Review

- Maintainers will review your PR and may request changes
- Address feedback by pushing new commits to your branch
- Once approved, a maintainer will merge your PR

---

## Project Structure

Understanding the project layout will help you navigate the codebase:

```
stellar-wrap-frontend/
├── app/                    # Next.js App Router pages and layouts
│   ├── [locale]/          # Internationalized routes
│   ├── actions/           # Server actions (e.g., persona generation)
│   ├── api/               # API routes
│   ├── components/        # Shared UI components
│   ├── context/           # React context providers
│   ├── data/              # Data fetching and processing
│   ├── hooks/             # Custom React hooks
│   ├── store/             # Zustand state management
│   ├── utils/             # Utility functions
│   └── vibe-check/        # Vibe check feature module
├── src/                   # Additional source files
│   ├── components/        # Legacy/shared components
│   ├── hooks/             # Custom hooks
│   ├── services/          # Service layer (Horizon API, etc.)
│   ├── store/             # Zustand stores
│   └── utils/             # Utility functions
├── components/            # Global UI components
├── config/                # Configuration files
├── public/                # Static assets
├── messages/              # i18n translation files
├── tests/                 # Test utilities and fixtures
├── __tests__/             # Jest test files
└── docs/                  # Additional documentation
```

### Key Technologies

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Wallet Integration**: Stellar SDK, Freighter API
- **Image Generation**: Vercel OG, html2canvas
- **Testing**: Jest, Vitest, Playwright

---

## Need Help?

- **Documentation**: Check [README.md](./README.md) for project overview and [TESTING.md](./TESTING.md) for testing details
- **Issues**: Search [existing issues](https://github.com/mathstickz/stellar-wrap-frontend/issues) or create a new one
- **Discussions**: Use [GitHub Discussions](https://github.com/mathstickz/stellar-wrap-frontend/discussions) for questions and ideas
- **Stellar Community**: Join the [Stellar Discord](https://discord.gg/stellar) for broader ecosystem support

---

## Recognition

All contributors will be acknowledged in our project. Thank you for helping make Stellar Wrap better for the entire Stellar community! 🌟

---

**Happy coding!** 🚀