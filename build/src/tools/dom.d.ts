/**
 * DOM Interaction Tools
 * Ported from Python query_elements, click_element, fill_element, navigate, get_console_logs
 */
/**
 * Find elements by CSS selector and return their details.
 *
 * Returns up to 'limit' elements (default 5, max 20).
 * Use specific selectors to narrow results when needed.
 */
export declare function queryElements(args: {
    selector: string;
    limit?: number;
    text_contains?: string;
    include_hidden?: boolean;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Click an element matching the CSS selector.
 *
 * Use query_elements first to verify the element exists and get the correct index.
 * Auto-includes element state and DOM diff when include_context is true (default).
 */
export declare function clickElement(args: {
    selector: string;
    index?: number;
    include_context?: boolean;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Fill text into an input element matching the CSS selector.
 *
 * Use query_elements first to verify the input exists and get the correct index.
 * Auto-includes element state and DOM diff when include_context is true (default).
 */
export declare function fillElement(args: {
    selector: string;
    text: string;
    index?: number;
    submit?: boolean;
    include_context?: boolean;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Navigate to a URL.
 * Auto-includes page title and element summary when include_context is true (default).
 */
export declare function navigate(args: {
    url: string;
    include_context?: boolean;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Get console log messages from the browser.
 *
 * Console messages are captured automatically when connected.
 * Returns the most recent messages (default: 3).
 * Use expand_errors: true to include full stack traces for error messages.
 *
 * Architecture: This function is a thin shell that orchestrates pure functions.
 * All data transformation and formatting is delegated to console-logs.ts.
 * Side effects (reading connection state, updating query tracking) are isolated here.
 */
export declare function getConsoleLogs(args: {
    filter_level?: string;
    limit?: number;
    expand_errors?: boolean;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Scroll the page in a specified direction or to an element.
 *
 * Use this to navigate to different parts of the page before querying elements.
 * Particularly useful for reading content at the bottom of long pages.
 */
export declare function scroll(args: {
    direction?: 'top' | 'bottom' | 'up' | 'down';
    selector?: string;
    pixels?: number;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Get text content from elements matching a selector.
 *
 * Returns just the text content without HTML structure or metadata.
 * Useful for reading conversation messages, article content, etc.
 * Use from_end=true to get the last N matches (e.g., recent messages).
 */
export declare function getPageText(args: {
    selector?: string;
    limit?: number;
    from_end?: boolean;
    max_length?: number;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Right-click on an element (dispatch contextmenu event).
 *
 * Useful for testing context menu handlers and right-click functionality.
 */
export declare function rightClick(args: {
    selector: string;
    index?: number;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Double-click on an element.
 *
 * Useful for text selection, grid row selection, and double-click handlers.
 */
export declare function doubleClick(args: {
    selector: string;
    index?: number;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Focus on an element (set keyboard focus).
 *
 * Useful for focus management and accessibility testing.
 */
export declare function focus(args: {
    selector: string;
    index?: number;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Blur an element (remove keyboard focus).
 *
 * Useful for testing blur handlers and focus management.
 */
export declare function blur(args: {
    selector: string;
    index?: number;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Press a key on the keyboard.
 *
 * Supports single keys (Enter, Escape, Tab, ArrowUp, etc.) and combinations (Control+a, Shift+Enter).
 * If selector provided, focuses element first. Otherwise dispatches on document.activeElement.
 */
export declare function pressKey(args: {
    key: string;
    selector?: string;
    index?: number;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Select an option from a <select> dropdown element.
 *
 * Supports selection by text (case-insensitive), index, or value attribute.
 */
export declare function selectOption(args: {
    selector: string;
    index?: number;
    option_text?: string;
    option_index?: number;
    option_value?: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
//# sourceMappingURL=dom.d.ts.map