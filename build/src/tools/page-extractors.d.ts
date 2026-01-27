/**
 * Page Extractors - Composable semantic extraction functions
 *
 * Framework-agnostic extractors that use only HTML semantics and ARIA roles.
 * Each extractor runs a single page.evaluate() call for efficiency.
 *
 * Note: All extractors use string templates for page.evaluate() to avoid
 * TypeScript DOM type issues (following pattern from dom.ts).
 */
import type { Page } from 'puppeteer';
import type { ExtractorConfig, ExtractorResult, FocusedElement, ButtonInfo, LinkInfo, InputInfo, FormInfo, ToggleInfo, AlertInfo, ModalInfo, ErrorInfo, LandmarkInfo, TabGroupInfo, HeadingInfo } from '../types.js';
/**
 * Extracts focused element information
 */
export declare function extractFocused(page: Page): Promise<FocusedElement | null>;
/**
 * Extracts button information
 */
export declare function extractButtons(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<ButtonInfo>>;
/**
 * Extracts link information
 */
export declare function extractLinks(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<LinkInfo>>;
/**
 * Extracts input field information
 */
export declare function extractInputs(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<InputInfo>>;
/**
 * Extracts form information with child inputs
 */
export declare function extractForms(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<FormInfo>>;
/**
 * Extracts toggle/checkbox/switch information
 */
export declare function extractToggles(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<ToggleInfo>>;
/**
 * Extracts alert/status message information
 */
export declare function extractAlerts(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<AlertInfo>>;
/**
 * Extracts modal/dialog information
 */
export declare function extractModals(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<ModalInfo>>;
/**
 * Extracts form validation error information
 */
export declare function extractErrors(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<ErrorInfo>>;
/**
 * Extracts landmark/region information
 */
export declare function extractLandmarks(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<LandmarkInfo>>;
/**
 * Extracts tab group information
 */
export declare function extractTabs(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<TabGroupInfo>>;
/**
 * Extracts heading information
 */
export declare function extractHeadings(page: Page, config?: ExtractorConfig): Promise<ExtractorResult<HeadingInfo>>;
//# sourceMappingURL=page-extractors.d.ts.map