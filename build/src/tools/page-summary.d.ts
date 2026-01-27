/**
 * Page Summary Composer - Orchestrates extractors into actionable output
 */
import type { Page } from 'puppeteer';
/**
 * Configuration for page summary generation
 */
export interface PageSummaryConfig {
    /** Which extractors to run */
    include?: {
        focused?: boolean;
        buttons?: boolean;
        links?: boolean;
        inputs?: boolean;
        forms?: boolean;
        toggles?: boolean;
        alerts?: boolean;
        modals?: boolean;
        errors?: boolean;
        landmarks?: boolean;
        tabs?: boolean;
        headings?: boolean;
    };
    /** Limits per category */
    limits?: {
        buttons?: number;
        links?: number;
        inputs?: number;
        forms?: number;
        toggles?: number;
        alerts?: number;
        modals?: number;
        errors?: number;
        landmarks?: number;
        tabs?: number;
        headings?: number;
    };
}
/**
 * Gathers a semantic page summary with actionable element information
 */
export declare function gatherPageSummary(page: Page, config?: PageSummaryConfig, connectionId?: string): Promise<string>;
//# sourceMappingURL=page-summary.d.ts.map