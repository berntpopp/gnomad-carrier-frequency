# gnomAD Carrier Frequency Calculator - Development Commands

.PHONY: dev dev-host build preview install clean test test-ui typecheck typecheck-watch lint lighthouse ci docs docs-dev docs-preview screenshots help

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
	@echo "  make lighthouse     - Run Lighthouse CI locally"
	@echo "  make ci             - Run full CI pipeline locally (lint, typecheck, build, lighthouse)"
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
	npm install

# Start development server with HMR (WSL2 polling enabled in vite.config.ts)
dev:
	npm run dev

# Start dev server accessible on local network
dev-host:
	npm run dev -- --host

# Build for production
build:
	npm run build

# Preview production build
preview:
	npm run preview

# TypeScript type checking (single run)
typecheck:
	npx vue-tsc --noEmit

# TypeScript type checking in watch mode
typecheck-watch:
	npx vue-tsc --noEmit --watch

# Run ESLint
lint:
	npm run lint

# Run Lighthouse CI locally (requires build first)
lighthouse: build
	npm run lighthouse

# Run full CI pipeline locally (matches GitHub Actions)
ci:
	npm run ci

# Run Playwright E2E tests (headless)
test:
	npx playwright test

# Run Playwright tests with UI
test-ui:
	npx playwright test --ui

# Build VitePress documentation site
docs:
	npm run docs:build

# Start docs dev server
docs-dev:
	npm run docs:dev

# Preview docs production build
docs-preview:
	npm run docs:preview

# Generate documentation screenshots
screenshots:
	@echo "Generating documentation screenshots..."
	@npx tsx scripts/generate-screenshots.ts
	@echo "Screenshots saved to docs/public/screenshots/"

# Clean build artifacts
clean:
	rm -rf dist node_modules .vite
