// ============================================================================
// Validation System - Main Export
// ============================================================================

// Types
export * from "./types";

// Dependency Analyzer
export {
  analyzeDependencies,
  inferDependenciesFromCode,
  findFilesRecursive,
  type AnalysisContext,
  type RequiredDependencies,
} from "./dependency-analyzer";

// Test Runner
export {
  runTests,
  runRelatedTests,
  runBuild,
  runTypeCheck,
  runLint,
  detectTestFramework,
  type RunTestsOptions,
} from "./test-runner";

// Validator (Orchestrator)
export {
  validateGeneration,
  initializeProgress,
  getProgress,
  updateProgress,
  addFeature,
  updateFeature,
  addComponent,
  addApi,
  addError,
  resolveError,
  updateTestResults,
  calculateETA,
  addCriticalQuestion,
  getPendingQuestions,
  answerQuestion,
  shouldPauseForQuestion,
  type ValidateOptions,
} from "./validator";

// Test Generator (TDD)
export {
  generateTestsForFeature,
  generateTestFileName,
  generateTestPath,
  generateTDDPrompt,
  generateTestRequirements,
  detectTestType,
  templates as testTemplates,
  type TestTemplate,
  type GeneratedTest,
  type TestGenerationContext,
} from "./test-generator";
