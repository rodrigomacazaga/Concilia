/**
 * Design System Auto-Update Module
 *
 * Detecta y documenta automáticamente componentes UI,
 * y reporta violaciones de estilo.
 */

// Component Detector
export {
  detectUIComponents,
  detectStyleViolations,
  markNewComponents,
  extractUniqueClasses,
  generateMarkdownForNewComponents,
  generateViolationsReport,
} from './component-detector';

export type {
  DetectedComponent,
  StyleViolation,
  DetectionResult,
} from './component-detector';

// Post-Execution Hook
export {
  designSystemPostHook,
  analyzeFullCodebase,
  initializeComponentLibrary,
} from './post-execution-hook';

export type {
  HookOptions,
  HookResult,
} from './post-execution-hook';
