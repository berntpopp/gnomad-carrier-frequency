# gnomAD Carrier Frequency Calculator - Development Commands

.PHONY: dev dev-host build preview install clean test test-ui typecheck typecheck-watch lint ci docs docs-dev docs-preview screenshots help

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install        - Install dependencies"
	@echo "  make dev            - Start development server with HMR"
	@echo "  make dev-host       - Start dev server accessible on network"
	@echo ""
	@echo "Building:"
	@echo "  make build          - Build for production"
	@echo "  make preview        - Preview production build"
	@echo ""
	@echo "Quality:"
	@echo "  make lint           - Run ESLint"
	@echo "  make typecheck      - Run TypeScript type checking"
	@echo "  make typecheck-watch - Run TypeScript type checking in watch mode"
	@echo "  make ci             - Run full CI pipeline locally (lint, typecheck, build, docs)"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run Playwright E2E tests"
	@echo "  make test-ui        - Run Playwright tests with UI"
	@echo ""
	@echo "Documentation:"
	@echo "  make docs           - Build VitePress documentation site"
	@echo "  make docs-dev       - Start docs dev server"
	@echo "  make docs-preview   - Preview docs production build"
	@echo "  make screenshots    - Generate documentation screenshots (requires Phase 17)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean          - Remove build artifacts and node_modules"

# Install dependencies
install:
	bun install

# Start development server with HMR (WSL2 polling enabled in vite.config.ts)
dev:
	bun run dev

# Start dev server accessible on local network
dev-host:
	bun run dev -- --host

# Build for production
build:
	bun run build

# Preview production build
preview:
	bun run preview

# TypeScript type checking (single run)
typecheck:
	bun run typecheck

# TypeScript type checking in watch mode
typecheck-watch:
	bunx vue-tsc --noEmit --watch

# Run ESLint
lint:
	bun run lint

# Run full CI pipeline locally (matches GitHub Actions)
ci:
	bun run ci

# Run Playwright E2E tests (headless)
test:
	bunx playwright test

# Run Playwright tests with UI
test-ui:
	bunx playwright test --ui

# Build VitePress documentation site
docs:
	bun run docs:build

# Start docs dev server
docs-dev:
	bun run docs:dev

# Preview docs production build
docs-preview:
	bun run docs:preview

# Generate documentation screenshots
screenshots:
	@echo "Generating documentation screenshots..."
	@bunx tsx scripts/generate-screenshots.ts
	@echo "Screenshots saved to docs/public/screenshots/"

# Clean build artifacts
clean:
	rm -rf dist node_modules .vite
