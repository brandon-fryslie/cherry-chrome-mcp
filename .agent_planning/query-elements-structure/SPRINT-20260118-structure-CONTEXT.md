# Implementation Context: structure

**Sprint:** Add HTML and Structure Summary to query_elements
**Generated:** 2026-01-18

## Key Files

| File | Purpose | Changes Required |
|------|---------|------------------|
| `src/tools/dom.ts` | DOM tools | Add extraction functions, update script |
| `src/types.ts` | Types | Add html, structure, interactive fields |
| `CLAUDE.md` | Docs | Update output format documentation |
| `README.md` | Docs | Update output format documentation |

## Implementation Details

### 1. New JavaScript Functions (in page context)

Add these functions to the script in `queryElements`:

```javascript
// Get opening tag only (no children)
function getOpeningTag(el) {
  const tag = el.tagName.toLowerCase();
  let attrs = '';
  for (const attr of el.attributes) {
    attrs += ` ${attr.name}="${attr.value}"`;
  }
  const html = `<${tag}${attrs}>`;
  return html.length > 200 ? html.substring(0, 197) + '...' : html;
}

// Generate CSS-like structure skeleton
function getStructure(el, depth = 0, maxDepth = 2) {
  if (depth >= maxDepth || el.children.length === 0) {
    return null;
  }

  // Group children by signature (tag + classes)
  const groups = [];
  let currentGroup = null;

  for (const child of el.children) {
    const sig = getSignature(child);

    if (currentGroup && currentGroup.sig === sig) {
      currentGroup.count++;
    } else {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { sig, count: 1, sample: child };
    }
  }
  if (currentGroup) groups.push(currentGroup);

  // Build structure string
  const parts = groups.map(g => {
    const base = g.sig;
    const multiplier = g.count > 1 ? `*${g.count}` : '';
    const nested = getStructure(g.sample, depth + 1, maxDepth);

    if (nested) {
      return g.count > 1
        ? `(${base} > ${nested})${multiplier}`
        : `${base} > ${nested}`;
    }
    return `${base}${multiplier}`;
  });

  return parts.join(' + ');
}

function getSignature(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = el.className
    ? '.' + el.className.split(' ').filter(c => c).slice(0, 2).join('.')
    : '';
  return tag + id + cls;
}

// Find interactive descendants
function getInteractive(el, limit = 6) {
  const interactive = [];
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
  const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'textbox', 'menuitem'];

  function walk(node) {
    if (interactive.length >= limit + 5) return; // Get a few extra to count

    const tag = node.tagName?.toLowerCase();
    const role = node.getAttribute?.('role');
    const hasHandler = node.onclick || node.hasAttribute?.('onclick');

    const isInteractive =
      interactiveTags.includes(tag) ||
      interactiveRoles.includes(role) ||
      hasHandler;

    if (isInteractive && node !== el) {
      interactive.push(getSelector(node));
    }

    for (const child of node.children || []) {
      walk(child);
    }
  }

  walk(el);

  if (interactive.length > limit) {
    const shown = interactive.slice(0, limit);
    const more = interactive.length - limit;
    return { items: shown, more };
  }
  return { items: interactive, more: 0 };
}

function getSelector(el) {
  if (el.id) return `#${el.id}`;

  const testId = el.getAttribute('data-testid');
  if (testId) return `[data-testid="${testId}"]`;

  const tag = el.tagName.toLowerCase();
  const cls = el.className
    ? '.' + el.className.split(' ').filter(c => c)[0]
    : '';
  return tag + cls;
}
```

### 2. Update Element Return Object

In the `limitedElements.map()` section, add:

```javascript
return {
  // ... existing fields ...
  html: getOpeningTag(el),
  structure: el.children.length > 0 ? getStructure(el) : null,
  interactive: el.children.length > 0 ? getInteractive(el) : { items: [], more: 0 },
  // ... rest of existing fields ...
};
```

### 3. Update Types

**src/types.ts:**

```typescript
export interface ElementInfo {
  index: number;
  selector: string;
  tag: string;
  text: string;
  id: string | null;
  classes: string[];
  visible: boolean;
  childInfo: { directChildren: number; totalDescendants: number } | null;
  position: { x: number; y: number; width: number; height: number };
  attributes: { type?: string; name?: string; placeholder?: string; value?: string };
  // NEW FIELDS:
  html: string;
  structure: string | null;
  interactive: { items: string[]; more: number };
}
```

### 4. Update Output Formatting

In the output building section:

```typescript
// After Classes line
if (el.html) {
  output.push(`    HTML: ${el.html}`);
}

// After HTML
if (el.structure) {
  output.push(`    Structure: ${el.structure}`);
}

// After Structure
if (el.interactive && el.interactive.items.length > 0) {
  let interactiveLine = `    Interactive: ${el.interactive.items.join(', ')}`;
  if (el.interactive.more > 0) {
    interactiveLine += ` +${el.interactive.more} more`;
  }
  output.push(interactiveLine);
}

// Existing childInfo becomes simpler "Children:" line
if (el.childInfo) {
  output.push(`    Children: ${el.childInfo.directChildren} direct, ${el.childInfo.totalDescendants} total`);
}
```

### 5. Example Output

**Input:** `query_elements({ selector: "form#login" })`

**Output:**
```
Found 1 element(s) matching 'form#login' (showing first 1):

[0] <form#login>
    ID: #login
    Classes: auth-form, card
    Text: Log in to your account Email Password Remember...
    HTML: <form id="login" class="auth-form card" action="/api/login" method="POST" data-testid="login-form">
    Structure: .form-group*2 > (label + input) + .actions > (button + a)
    Interactive: input#email, input#password, button[type=submit], a.forgot-password
    Children: 3 direct, 11 total
    Visible: true
```

## Edge Cases

1. **Self-closing elements** (img, input, br): HTML has no closing tag, structure is null
2. **Very deep nesting**: Structure truncated at depth 2
3. **Many siblings**: Structure groups repeated patterns
4. **No interactive children**: Interactive line omitted
5. **Long attribute values**: HTML truncated at 200 chars

## Performance Considerations

- Structure generation is O(n) where n = children at depth 0-2
- Interactive walk is O(n) where n = all descendants
- Both are bounded by reasonable page sizes
- Run in browser context, shouldn't block
