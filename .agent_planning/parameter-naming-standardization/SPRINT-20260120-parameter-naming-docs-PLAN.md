# Sprint: Parameter Naming Documentation

Generated: 2026-01-20 09:50:00
Confidence: HIGH
Status: READY FOR IMPLEMENTATION

## Sprint Goal

Document the existing parameter naming convention (snake_case for MCP parameters, camelCase internally) to formalize best practices and prevent future drift. This is a **documentation sprint**, not a code refactoring sprint - the code is already correct!

## Scope

**Deliverables:**
1. Document parameter naming convention in CLAUDE.md
2. Add contributing guidelines for new tool parameters
3. Update README.md with parameter convention note
4. (Optional) Create ESLint rule for automated enforcement

**Out of Scope:**
- Changing existing code (already follows convention correctly)
- Runtime parameter validation (deferred to future sprint)
- Refactoring tool implementations

## Work Items

### Phase 1: Core Documentation

**File:** `CLAUDE.md`

**Acceptance Criteria:**
- [ ] Add "Parameter Naming Convention" section after "Implementation Patterns"
- [ ] Document snake_case for MCP parameters (external API)
- [ ] Document camelCase for internal TypeScript variables
- [ ] Provide examples of correct usage from existing tools
- [ ] Explain CDP parameter conversion pattern (snake_case → camelCase)
- [ ] Add "Contributing" subsection with guidelines for new tools

**Content Structure:**
```markdown
## Parameter Naming Convention

### External API (MCP Parameters)

All tool parameters follow **snake_case** naming convention as per MCP SDK standards:

- `connection_id` - Chrome connection identifier
- `text_contains` - Text filter for element search
- `include_hidden` - Include hidden elements flag
- `line_number` - Line number for breakpoints (1-indexed)
- `call_frame_id` - CDP call frame identifier

**Example:**
```typescript
export async function queryElements(args: {
  selector: string;
  limit?: number;
  text_contains?: string;      // snake_case
  include_hidden?: boolean;     // snake_case
  connection_id?: string;       // snake_case
}): Promise<ToolResult>
```

### Internal TypeScript (Implementation)

Internal variables follow **camelCase** TypeScript convention:

```typescript
const page = browserManager.getPageOrThrow(args.connection_id);
const textContainsFilter = args.text_contains;  // Convert to camelCase
const includeHidden = args.include_hidden ?? false;
```

### CDP Parameter Conversion

Chrome DevTools Protocol (CDP) expects **camelCase** parameters. Convert when calling CDP methods:

```typescript
// MCP parameter (snake_case)
const args = {
  line_number: 42,
  column_number: 10,
};

// CDP call (camelCase)
await cdpSession.send('Debugger.setBreakpointByUrl', {
  lineNumber: args.line_number - 1,      // Converted + adjusted
  columnNumber: args.column_number ?? 0, // Converted
});
```

### Contributing: Adding New Tool Parameters

When adding new tools or parameters:

1. **Use snake_case for all MCP parameter names**
   - Good: `data_testid`, `aria_label`, `include_context`
   - Bad: `dataTestId`, `ariaLabel`, `includeContext`

2. **Convert to camelCase for internal variables**
   - External: `some_param_name`
   - Internal: `const someParamValue = args.some_param_name;`

3. **Match existing parameter names for consistency**
   - Use `connection_id` (not `conn_id`, `connection`, etc.)
   - Use `include_hidden` (not `show_hidden`, `hidden`, etc.)

4. **Document parameter purpose in schema**
   - Add clear `description` field
   - Specify default values
   - Note any validation rules
```

**Effort:** 1 hour

### Phase 2: README Update

**File:** `README.md`

**Acceptance Criteria:**
- [ ] Add note in "Common Commands" or "Architecture" section
- [ ] Reference CLAUDE.md for developer details
- [ ] Keep brief (1-2 sentences)

**Content:**
```markdown
## Parameter Naming

Tool parameters follow MCP SDK snake_case convention (e.g., `connection_id`, `text_contains`). See CLAUDE.md for implementation details.
```

**Effort:** 15 minutes

### Phase 3: Optional ESLint Rule (Deferred)

**File:** `.eslintrc.js` or `.eslintrc.json`

**Acceptance Criteria:**
- [ ] Create custom ESLint rule to enforce snake_case in tool parameter interfaces
- [ ] Rule triggers on exported function parameters in src/tools/
- [ ] Rule ignores internal functions and variables
- [ ] CI runs ESLint check and fails on violations

**Example Rule:**
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'parameter',
        format: ['snake_case'],
        filter: {
          // Only apply to exported tool functions in src/tools/
          regex: '^(connection_id|text_contains|include_hidden|line_number|.*_id|.*_name|.*_number)$',
          match: true,
        },
      },
    ],
  },
};
```

**Effort:** 2-3 hours (research + implementation + testing)

**Status:** DEFERRED (not required for MVP)

## Dependencies

**External Dependencies:**
- None (documentation only)

**Internal Dependencies:**
- None (can be done independently of tool registry implementation)

**Suggested Order:**
1. This sprint can be done BEFORE or AFTER tool registry implementation
2. If done AFTER registry: Update documentation to reference registry pattern
3. If done BEFORE registry: No conflicts, registry will follow same convention

## Risks

### Risk 1: Documentation Drift
**Severity:** Medium
**Impact:** Documentation becomes outdated as code evolves
**Mitigation:**
- Link documentation to contributing guidelines
- Add pre-commit hook reminder to update docs
- Periodic documentation review (quarterly)

### Risk 2: Incomplete Coverage
**Severity:** Low
**Impact:** Some edge cases not documented
**Mitigation:**
- Focus on common patterns (80/20 rule)
- Provide examples from real tools
- Add "See implementation for details" notes

### Risk 3: ESLint Rule False Positives (Phase 3)
**Severity:** Low
**Impact:** Rule flags valid code as violations
**Mitigation:**
- Start with warnings, not errors
- Whitelist known exceptions
- Defer to Phase 3 (optional)

## Success Criteria

### Documentation Quality
- ✅ CLAUDE.md has clear "Parameter Naming Convention" section
- ✅ Examples provided from real codebase (queryElements, debuggerSetBreakpoint)
- ✅ Contributing guidelines added for new tools
- ✅ README.md references parameter convention

### Clarity
- ✅ Developers understand snake_case vs camelCase usage
- ✅ CDP conversion pattern documented with examples
- ✅ Guidelines prevent future naming violations

### Completeness
- ✅ All common parameter patterns documented (connection_id, text_contains, etc.)
- ✅ Edge cases mentioned (nested objects, CDP conversion)
- ✅ Migration path for existing code (N/A - already correct)

## Implementation Sequence

1. **Phase 1** (1 hour): Document parameter naming in CLAUDE.md
   - Write "Parameter Naming Convention" section
   - Add contributing guidelines
   - Provide code examples

2. **Phase 2** (15 minutes): Update README.md
   - Add brief parameter naming note
   - Link to CLAUDE.md

3. **Phase 3** (DEFERRED): ESLint rule implementation
   - Research @typescript-eslint/naming-convention
   - Create custom rule for tool parameters
   - Test on existing codebase
   - Add to CI pipeline

**Total Effort:** 1-2 hours (Phases 1-2 only)

## Exit Criteria

**MUST HAVE (blocking):**
- CLAUDE.md has "Parameter Naming Convention" section
- Contributing guidelines added
- README.md updated
- Documentation reviewed for accuracy

**SHOULD HAVE (non-blocking):**
- Examples from at least 3 different tools
- CDP conversion pattern explained
- Clear distinction between external API and internal implementation

**COULD HAVE (deferred):**
- ESLint rule for automated enforcement
- Pre-commit hook reminder
- CI check for documentation updates

---

**Status:** READY FOR IMPLEMENTATION
**Confidence:** HIGH
**Effort:** 1-2 hours (documentation only)
**Next Step:** Begin Phase 1 - Document in CLAUDE.md
