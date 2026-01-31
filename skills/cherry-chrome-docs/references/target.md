# target

List or switch browser targets (pages, workers, service workers).

## Prerequisites

Connection via `connect()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `action` | yes | `"list"` or `"switch"` |
| `index` | switch only | Target index from list |
| `url` | switch only | URL pattern with `*` wildcards |
| `title` | switch only | Partial title match |
| `connection_id` | no | Connection to use |

For switch, provide one of: `index`, `url`, or `title`.

## Output

**list:**
```
Targets:
  [0] page: https://example.com (current)
  [1] page: https://other.com
  [2] worker: service-worker.js
```

**switch:**
```
Switched to target: https://other.com
```
