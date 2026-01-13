# Cherry Chrome MCP justfile

# Default recipe - list available commands
default:
    @just --list

# Build TypeScript
build:
    npm run build

# Watch mode for development
dev:
    npm run dev

# Build and run tests
test:
    npm run test

# Watch tests (requires build first)
test-watch:
    npm run test:watch

# Build and start the MCP server
start:
    npm run start

# Remove build directory
clean:
    npm run clean

# Rebuild from scratch
rebuild: clean build

# Test with MCP Inspector (legacy mode)
inspector:
    npx @modelcontextprotocol/inspector node build/src/index.js

# Test with MCP Inspector (smart mode)
inspector-smart:
    USE_SMART_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js

# Run feature toggle tests
test-toggle:
    ./test-toggle.sh

# Install dependencies
install:
    npm install

# Check TypeScript without emitting
check:
    npx tsc --noEmit
