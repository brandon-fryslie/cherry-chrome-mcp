# Common Workflows

Multi-tool workflows for cherry-chrome-mcp.

---

## Basic Page Interaction

```
1. connect({ url: 'https://example.com' })
2. query_elements({ selector: 'button' })           -- find elements
3. interact({ action: 'click', selector: '#submit' }) -- click one
4. get_console_logs()                                 -- check for errors
```

## Form Filling

```
1. query_elements({ selector: 'input' })              -- find inputs
2. fill_element({ selector: '#email', text: 'a@b.com' })
3. fill_element({ selector: '#password', text: 'secret' })
4. interact({ action: 'click', selector: 'button[type="submit"]' })
```

## Finding Elements When Selector Unknown

```
1. inspect_element({ description: 'login button' })   -- get selector candidates
2. query_elements({ selector: '#login-btn' })          -- verify with recommended selector
3. interact({ action: 'click', selector: '#login-btn' })
```

## Debugging JavaScript

```
1. connect({ url: 'https://localhost:3000' })
2. enable_debug_tools()
3. breakpoint({ action: 'set', url: 'http://localhost:3000/main.js', line_number: 42 })
4. -- trigger the code (click button, navigate, etc.)
5. call_stack()                                        -- get frames when paused
6. evaluate({ call_frame_id: '<id from step 5>', expression: 'myVar' })
7. step({ direction: 'over' })                         -- advance one line
8. evaluate({ call_frame_id: '<new id>', expression: 'myVar' })  -- re-get ID after step
9. execution({ action: 'resume' })                     -- continue running
```

## Debugging Exceptions

```
1. enable_debug_tools()
2. pause_on_exceptions({ state: 'uncaught' })          -- or 'all' for caught too
3. -- trigger the error
4. call_stack()                                        -- paused at exception
5. evaluate({ call_frame_id: '<id>', expression: 'err.message' })
6. execution({ action: 'resume' })
```

## Multi-Tab / Multi-Connection

```
-- Multiple connections to different Chrome instances:
1. connect({ url: 'https://app.com', connection_id: 'app' })
2. connect({ url: 'https://admin.com', connection_id: 'admin' })
3. chrome_switch_connection({ connection_id: 'admin' })
4. query_elements({ selector: '.user-row' })           -- queries admin page

-- Multiple tabs in same Chrome:
1. connect({ url: 'https://example.com' })
2. target({ action: 'list' })                          -- see all pages
3. target({ action: 'switch', url: '*other*' })        -- switch by URL pattern
```

## Reconnecting to Same URL

```
-- connect() reuses existing connections automatically:
1. connect({ url: 'https://example.com' })             -- launches Chrome
2. connect({ url: 'https://other.com' })               -- navigates same connection
3. connect({ url: 'https://third.com', connection_id: 'other' }) -- new connection
```

## Reading Chat/Log UIs

```
-- get_page_text with from_end reads most recent messages:
1. get_page_text({ selector: '.message', from_end: true, limit: 5 })
```

## Scrolling

```
-- By direction:
interact({ action: 'scroll', direction: 'down', pixels: 300 })
interact({ action: 'scroll', direction: 'top' })       -- scroll to top

-- To element:
interact({ action: 'scroll', selector: '#footer' })    -- scroll into view
```

## Keyboard Navigation

```
-- Press key on focused element:
interact({ action: 'press-key', key: 'Tab' })
interact({ action: 'press-key', key: 'Enter' })

-- Press key on specific element:
interact({ action: 'press-key', selector: 'input#search', key: 'Enter' })

-- Key combinations:
interact({ action: 'press-key', key: 'Control+a' })    -- select all
interact({ action: 'press-key', key: 'Shift+Tab' })    -- reverse tab
```

## Dropdown Selection

```
-- By visible text:
interact({ action: 'select-option', selector: 'select#country', option_text: 'United States' })

-- By index:
interact({ action: 'select-option', selector: 'select#country', option_index: 2 })

-- By value attribute:
interact({ action: 'select-option', selector: 'select#country', option_value: 'us' })
```
