# Cherry Chrome MCP justfile

# Default recipe - list available commands
default:
    @just --list

# Build TypeScript
build:
    pnpm build

# Watch mode for development
dev:
    pnpm dev

# Build and run tests
test:
    pnpm test

# Watch tests (requires build first)
test-watch:
    pnpm test:watch

# Build and start the MCP server
start:
    pnpm start

# Remove build directory
clean:
    pnpm clean

# Rebuild from scratch
rebuild: clean build

# Test with MCP Inspector (legacy mode)
inspector:
    pnpm dlx @modelcontextprotocol/inspector node build/src/index.js

# Test with MCP Inspector (smart mode)
inspector-smart:
    USE_SMART_TOOLS=true pnpm dlx @modelcontextprotocol/inspector node build/src/index.js

# Run feature toggle tests
test-toggle:
    ./test-toggle.sh

# Install dependencies
install:
    pnpm install

# Check TypeScript without emitting
check:
    pnpm exec tsc --noEmit
