"""
Configuration for Chrome DevTools MCP Wrapper
Edit these values to customize behavior
"""

# Command to launch the Chrome DevTools MCP server
# Using the local reference server that was cloned
CHROME_DEVTOOLS_COMMAND = "/Users/bmf/.local/share/fnm/node-versions/v22.20.0/installation/bin/node"
CHROME_DEVTOOLS_ARGS = ["/Users/bmf/code/chrome-debugger-mcp/reference-chrome-devtools-mcp/build/src/index.js"]

# Maximum result size in characters
# Results larger than this will be REJECTED with a helpful error message
# (not truncated - that would waste tokens on incomplete data)
# 5000 chars ≈ 1250 tokens (rough estimate)
MAX_RESULT_SIZE = 5000

# Maximum DOM depth for query_elements
# Elements nested deeper than this are filtered out to prevent returning
# the entire page when querying broad selectors like "div"
# Depth is measured from document.body
# Setting this low (3) forces agents to use specific selectors
# Agents can override with max_depth parameter up to HARD_MAX_DOM_DEPTH
MAX_DOM_DEPTH = 3

# Hard limit for DOM depth
# Even if agent requests higher depth, this is the absolute maximum
# Prevents returning massive amounts of irrelevant data
HARD_MAX_DOM_DEPTH = 10

# Enable debug logging
DEBUG = True
