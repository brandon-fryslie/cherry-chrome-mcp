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
 */
export declare function getConsoleLogs(args: {
    filter_level?: string;
    limit?: number;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
//# sourceMappingURL=dom.d.ts.map