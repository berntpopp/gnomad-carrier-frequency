# gnomAD Carrier Frequency Calculator - Development Commands

.PHONY: dev build preview install clean test lint typecheck help

# Default target
help:
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Start development server"
	@echo "  make build      - Build for production"
	@echo "  make preview    - Preview production build"
	@echo "  make typecheck  - Run TypeScript type checking"
	@echo "  make test       - Run Playwright E2E tests"
	@echo "  make test-ui    - Run Playwright tests with UI"
	@echo "  make clean      - Remove build artifacts and node_modules"

# Install dependencies
install:
	npm install

# Start development server
dev:
	npm run dev

# Build for production
build:
	npm run build

# Preview production build
preview:
	npm run preview

# TypeScript type checking
typecheck:
	npx vue-tsc --noEmit

# Run Playwright E2E tests
test:
	npx playwright test

# Run Playwright tests with UI
test-ui:
	npx playwright test --ui

# Clean build artifacts
clean:
	rm -rf dist node_modules .vite
