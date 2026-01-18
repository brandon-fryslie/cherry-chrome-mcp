#!/bin/bash
# Test script to verify feature toggle works for both modes

set -e

echo "Building project..."
npm run build

echo ""
echo "=========================================="
echo "Testing SMART MODE (USE_LEGACY_TOOLS=false)"
echo "=========================================="
echo ""

# Start server in smart mode (default) and send a ListTools request
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node build/src/index.js 2>&1 | head -20 &
SMART_PID=$!
sleep 2
kill $SMART_PID 2>/dev/null || true

echo ""
echo "=========================================="
echo "Testing LEGACY MODE (USE_LEGACY_TOOLS=true)"
echo "=========================================="
echo ""

# Start server in legacy mode and send a ListTools request
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | USE_LEGACY_TOOLS=true node build/src/index.js 2>&1 | head -20 &
LEGACY_PID=$!
sleep 2
kill $LEGACY_PID 2>/dev/null || true

echo ""
echo "=========================================="
echo "Test complete!"
echo "=========================================="
echo ""
echo "Both modes should have started successfully."
echo "Check the output above for mode indicators:"
echo "  - Smart mode (default): [MODE: SMART TOOLS]"
echo "  - Legacy mode: [MODE: LEGACY TOOLS]"
