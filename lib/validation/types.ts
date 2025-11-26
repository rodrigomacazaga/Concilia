// ============================================================================
// Validation System Types
// ============================================================================

// Dependency Analysis
export type DependencyType = "api" | "database" | "component" | "type" | "service" | "hook" | "util";

export interface DependencyCheck {
  type: DependencyType;
  name: string;
  exists: boolean;
  path?: string;
  details?: string;
  critical: boolean;
}

export interface DependencyAnalysis {
  allSatisfied: boolean;
  checks: DependencyCheck[];
  missing: DependencyCheck[];
  criticalMissing: DependencyCheck[];
  suggestions: string[];
}

// Test Generation
export type TestType = "unit" | "integration" | "api" | "component" | "e2e";
export type TestFramework = "vitest" | "jest" | "pytest" | "none";

export interface TestConfig {
  type: TestType;
  framework: TestFramework;
  target: string;
  description: string;
}

export interface GeneratedTest {
  filename: string;
  content: string;
  type: TestType;
  targetFile: string;
}

// Test Results
export interface TestResult {
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  output: string;
  errors: TestError[];
  coverage?: CoverageResult;
}

export interface TestError {
  testName: string;
  message: string;
  stack?: string;
  expected?: string;
  actual?: string;
}

export interface CoverageResult {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

// Type Checking
export interface TypeCheckResult {
  success: boolean;
  errors: TypeCheckError[];
  warnings: TypeCheckError[];
}

export interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: "error" | "warning";
}

// Build Results
export interface BuildResult {
  success: boolean;
  duration: number;
  errors: string[];
  warnings: string[];
  output: string;
}

// Lint Results
export interface LintResult {
  success: boolean;
  errors: LintError[];
  warnings: LintError[];
  fixable: number;
}

export interface LintError {
  file: string;
  line: number;
  column: number;
  message: string;
  rule: string;
  severity: "error" | "warning";
}

// Full Validation
export interface ValidationPhase {
  name: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  duration: number;
  details: unknown;
  errors: string[];
}

export interface ValidationResult {
  success: boolean;
  phases: ValidationPhase[];
  summary: ValidationSummary;
  recommendations: string[];
  criticalIssues: string[];
}

export interface ValidationSummary {
  dependenciesMissing: number;
  criticalDependenciesMissing: number;
  testsPassed: number;
  testsFailed: number;
  typeErrors: number;
  lintErrors: number;
  buildSuccess: boolean;
}

// Development Progress Tracking
export interface DevelopmentProgress {
  projectId: string;
  sessionId: string;
  startedAt: Date;
  lastUpdated: Date;

  // Features
  features: FeatureProgress[];

  // Components
  components: ComponentProgress[];

  // APIs
  apis: ApiProgress[];

  // Tests
  tests: TestProgress;

  // Errors
  errors: ErrorTracker;

  // Overall Status
  status: ProjectStatus;

  // ETA
  eta?: {
    estimatedCompletion: Date;
    confidence: number;
    basedOn: string;
  };
}

export interface FeatureProgress {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "testing" | "completed" | "blocked";
  progress: number; // 0-100
  dependencies: string[];
  blockedBy?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ComponentProgress {
  name: string;
  path: string;
  status: "planned" | "created" | "tested" | "verified";
  hasTests: boolean;
  errors: number;
}

export interface ApiProgress {
  route: string;
  methods: string[];
  status: "planned" | "implemented" | "tested" | "documented";
  hasTests: boolean;
}

export interface TestProgress {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  lastRun?: Date;
}

export interface ErrorTracker {
  console: ErrorEntry[];
  build: ErrorEntry[];
  runtime: ErrorEntry[];
  logic: ErrorEntry[];
  resolved: number;
  unresolved: number;
}

export interface ErrorEntry {
  id: string;
  type: "console" | "build" | "runtime" | "logic";
  message: string;
  file?: string;
  line?: number;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

export interface ProjectStatus {
  phase: "planning" | "development" | "testing" | "review" | "completed";
  overallProgress: number; // 0-100
  health: "healthy" | "at_risk" | "critical";
  blockers: string[];
}

// Critical Questions
export interface CriticalQuestion {
  id: string;
  timestamp: Date;
  context: string;
  question: string;
  reason: string;
  priority: "high" | "critical";
  options?: string[];
  defaultOption?: string;
  answered: boolean;
  answer?: string;
}

export interface QuestionContext {
  currentTask: string;
  relatedFiles: string[];
  memoryBankGaps: string[];
  assumptions: string[];
}
