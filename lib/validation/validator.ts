// ============================================================================
// Validation Orchestrator - Coordinates all validation phases
// ============================================================================

import { logger } from "@/lib/observability/logger";
import {
  analyzeDependencies,
  inferDependenciesFromCode,
  type AnalysisContext,
} from "./dependency-analyzer";
import {
  runTests,
  runRelatedTests,
  runBuild,
  runTypeCheck,
  runLint,
  detectTestFramework,
} from "./test-runner";
import type {
  ValidationResult,
  ValidationPhase,
  ValidationSummary,
  DevelopmentProgress,
  FeatureProgress,
  ComponentProgress,
  ApiProgress,
  ErrorEntry,
  CriticalQuestion,
} from "./types";

// ============================================================================
// Main Validation Function
// ============================================================================

export interface ValidateOptions {
  projectPath: string;
  serviceName?: string;
  feature: string;
  generatedCode: string;
  generatedFiles: string[];
  skipTests?: boolean;
  skipTypes?: boolean;
  skipLint?: boolean;
  skipBuild?: boolean;
}

export async function validateGeneration(
  options: ValidateOptions
): Promise<ValidationResult> {
  const {
    projectPath,
    serviceName,
    feature,
    generatedCode,
    generatedFiles,
    skipTests = false,
    skipTypes = false,
    skipLint = true, // Skip by default for speed
    skipBuild = true, // Skip by default for speed
  } = options;

  const phases: ValidationPhase[] = [];
  const recommendations: string[] = [];
  const criticalIssues: string[] = [];
  let overallSuccess = true;

  logger.info("Starting validation", {
    feature,
    files: generatedFiles.length,
    skipTests,
    skipTypes,
  });

  // =========================================================================
  // PHASE 1: Dependency Analysis
  // =========================================================================
  const depPhase = await runPhase("Dependency Analysis", async () => {
    const dependencies = inferDependenciesFromCode(generatedCode);
    const context: AnalysisContext = {
      projectPath,
      serviceName,
      requestedFeature: feature,
    };

    const analysis = await analyzeDependencies(context, dependencies);

    if (!analysis.allSatisfied) {
      recommendations.push(...analysis.suggestions);

      if (analysis.criticalMissing.length > 0) {
        for (const dep of analysis.criticalMissing) {
          criticalIssues.push(
            `Missing critical dependency: ${dep.type} "${dep.name}"`
          );
        }
      }
    }

    return {
      success: analysis.criticalMissing.length === 0,
      details: analysis,
      errors: analysis.criticalMissing.map(
        (d) => `Missing ${d.type}: ${d.name}`
      ),
    };
  });

  phases.push(depPhase);
  if (!depPhase.status.includes("success")) {
    overallSuccess = false;
  }

  // =========================================================================
  // PHASE 2: Type Checking (if not skipped)
  // =========================================================================
  if (
    !skipTypes &&
    generatedFiles.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
  ) {
    const typePhase = await runPhase("Type Checking", async () => {
      const result = await runTypeCheck(projectPath, generatedFiles);

      if (!result.success) {
        for (const error of result.errors.slice(0, 5)) {
          recommendations.push(
            `Fix type error in ${error.file}:${error.line}: ${error.message}`
          );
        }
      }

      return {
        success: result.success,
        details: result,
        errors: result.errors.map(
          (e) => `${e.file}:${e.line} - ${e.message} (${e.code})`
        ),
      };
    });

    phases.push(typePhase);
    if (!typePhase.status.includes("success")) {
      overallSuccess = false;
    }
  }

  // =========================================================================
  // PHASE 3: Linting (if not skipped)
  // =========================================================================
  if (!skipLint) {
    const lintPhase = await runPhase("Linting", async () => {
      const result = await runLint(projectPath, generatedFiles);

      if (!result.success) {
        for (const error of result.errors.slice(0, 5)) {
          recommendations.push(
            `Fix lint error in ${error.file}:${error.line}: ${error.message}`
          );
        }
      }

      return {
        success: result.success,
        details: result,
        errors: result.errors.map(
          (e) => `${e.file}:${e.line} - ${e.message} (${e.rule})`
        ),
      };
    });

    phases.push(lintPhase);
    // Lint errors are warnings, don't fail overall
  }

  // =========================================================================
  // PHASE 4: Test Execution (if not skipped)
  // =========================================================================
  if (!skipTests) {
    const testPhase = await runPhase("Test Execution", async () => {
      const framework = await detectTestFramework(projectPath);

      if (framework === "none") {
        recommendations.push(
          "Consider adding a test framework (vitest recommended)"
        );
        return {
          success: true,
          details: { message: "No test framework configured" },
          errors: [],
        };
      }

      // Run tests related to generated files
      let totalPassed = 0;
      let totalFailed = 0;
      let totalSkipped = 0;
      const allErrors: string[] = [];

      for (const file of generatedFiles) {
        const result = await runRelatedTests(projectPath, file);
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
        allErrors.push(...result.errors.map((e) => `${e.testName}: ${e.message}`));
      }

      if (totalFailed > 0) {
        recommendations.push(`${totalFailed} test(s) failed. Review errors.`);
      }

      return {
        success: totalFailed === 0,
        details: {
          passed: totalPassed,
          failed: totalFailed,
          skipped: totalSkipped,
        },
        errors: allErrors,
      };
    });

    phases.push(testPhase);
    if (!testPhase.status.includes("success")) {
      overallSuccess = false;
    }
  }

  // =========================================================================
  // PHASE 5: Build Verification (if not skipped)
  // =========================================================================
  if (!skipBuild) {
    const buildPhase = await runPhase("Build Verification", async () => {
      const result = await runBuild(projectPath);

      if (!result.success) {
        for (const error of result.errors.slice(0, 5)) {
          criticalIssues.push(`Build error: ${error}`);
        }
      }

      return {
        success: result.success,
        details: result,
        errors: result.errors,
      };
    });

    phases.push(buildPhase);
    if (!buildPhase.status.includes("success")) {
      overallSuccess = false;
    }
  }

  // =========================================================================
  // Calculate Summary
  // =========================================================================
  const summary: ValidationSummary = {
    dependenciesMissing:
      (phases.find((p) => p.name === "Dependency Analysis")?.details as any)
        ?.missing?.length || 0,
    criticalDependenciesMissing:
      (phases.find((p) => p.name === "Dependency Analysis")?.details as any)
        ?.criticalMissing?.length || 0,
    testsPassed:
      (phases.find((p) => p.name === "Test Execution")?.details as any)?.passed ||
      0,
    testsFailed:
      (phases.find((p) => p.name === "Test Execution")?.details as any)?.failed ||
      0,
    typeErrors:
      (phases.find((p) => p.name === "Type Checking")?.details as any)?.errors
        ?.length || 0,
    lintErrors:
      (phases.find((p) => p.name === "Linting")?.details as any)?.errors
        ?.length || 0,
    buildSuccess:
      (phases.find((p) => p.name === "Build Verification")?.details as any)
        ?.success ?? true,
  };

  logger.info("Validation complete", {
    success: overallSuccess,
    summary,
    recommendations: recommendations.length,
    criticalIssues: criticalIssues.length,
  });

  return {
    success: overallSuccess,
    phases,
    summary,
    recommendations,
    criticalIssues,
  };
}

// ============================================================================
// Phase Runner Helper
// ============================================================================

async function runPhase(
  name: string,
  fn: () => Promise<{
    success: boolean;
    details: unknown;
    errors: string[];
  }>
): Promise<ValidationPhase> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    return {
      name,
      status: result.success ? "success" : "failed",
      duration,
      details: result.details,
      errors: result.errors,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Phase ${name} failed`, error);

    return {
      name,
      status: "failed",
      duration,
      details: { error: error instanceof Error ? error.message : "Unknown error" },
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// ============================================================================
// Development Progress Tracking
// ============================================================================

// In-memory store for development progress
const progressStore: Map<string, DevelopmentProgress> = new Map();

export function initializeProgress(
  projectId: string,
  sessionId: string
): DevelopmentProgress {
  const progress: DevelopmentProgress = {
    projectId,
    sessionId,
    startedAt: new Date(),
    lastUpdated: new Date(),
    features: [],
    components: [],
    apis: [],
    tests: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: 0,
    },
    errors: {
      console: [],
      build: [],
      runtime: [],
      logic: [],
      resolved: 0,
      unresolved: 0,
    },
    status: {
      phase: "planning",
      overallProgress: 0,
      health: "healthy",
      blockers: [],
    },
  };

  progressStore.set(sessionId, progress);
  return progress;
}

export function getProgress(sessionId: string): DevelopmentProgress | null {
  return progressStore.get(sessionId) || null;
}

export function updateProgress(
  sessionId: string,
  updates: Partial<DevelopmentProgress>
): DevelopmentProgress | null {
  const current = progressStore.get(sessionId);
  if (!current) return null;

  const updated = {
    ...current,
    ...updates,
    lastUpdated: new Date(),
  };

  // Recalculate overall progress
  updated.status.overallProgress = calculateOverallProgress(updated);

  // Update health status
  updated.status.health = calculateHealth(updated);

  progressStore.set(sessionId, updated);
  return updated;
}

export function addFeature(
  sessionId: string,
  feature: Omit<FeatureProgress, "id">
): FeatureProgress | null {
  const progress = progressStore.get(sessionId);
  if (!progress) return null;

  const newFeature: FeatureProgress = {
    ...feature,
    id: `feature-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };

  progress.features.push(newFeature);
  progress.lastUpdated = new Date();
  progress.status.overallProgress = calculateOverallProgress(progress);

  return newFeature;
}

export function updateFeature(
  sessionId: string,
  featureId: string,
  updates: Partial<FeatureProgress>
): FeatureProgress | null {
  const progress = progressStore.get(sessionId);
  if (!progress) return null;

  const feature = progress.features.find((f) => f.id === featureId);
  if (!feature) return null;

  Object.assign(feature, updates);
  progress.lastUpdated = new Date();
  progress.status.overallProgress = calculateOverallProgress(progress);

  return feature;
}

export function addComponent(
  sessionId: string,
  component: ComponentProgress
): void {
  const progress = progressStore.get(sessionId);
  if (!progress) return;

  const existing = progress.components.find((c) => c.path === component.path);
  if (existing) {
    Object.assign(existing, component);
  } else {
    progress.components.push(component);
  }

  progress.lastUpdated = new Date();
}

export function addApi(sessionId: string, api: ApiProgress): void {
  const progress = progressStore.get(sessionId);
  if (!progress) return;

  const existing = progress.apis.find((a) => a.route === api.route);
  if (existing) {
    Object.assign(existing, api);
  } else {
    progress.apis.push(api);
  }

  progress.lastUpdated = new Date();
}

export function addError(sessionId: string, error: Omit<ErrorEntry, "id">): void {
  const progress = progressStore.get(sessionId);
  if (!progress) return;

  const newError: ErrorEntry = {
    ...error,
    id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };

  progress.errors[error.type].push(newError);
  progress.errors.unresolved++;
  progress.lastUpdated = new Date();

  // Update health if too many errors
  if (progress.errors.unresolved > 10) {
    progress.status.health = "at_risk";
  }
  if (progress.errors.unresolved > 20) {
    progress.status.health = "critical";
  }
}

export function resolveError(
  sessionId: string,
  errorId: string,
  resolution: string
): void {
  const progress = progressStore.get(sessionId);
  if (!progress) return;

  for (const type of ["console", "build", "runtime", "logic"] as const) {
    const error = progress.errors[type].find((e) => e.id === errorId);
    if (error && !error.resolved) {
      error.resolved = true;
      error.resolution = resolution;
      progress.errors.resolved++;
      progress.errors.unresolved--;
      break;
    }
  }

  progress.lastUpdated = new Date();
  progress.status.health = calculateHealth(progress);
}

export function updateTestResults(
  sessionId: string,
  results: { passed: number; failed: number; skipped: number; coverage?: number }
): void {
  const progress = progressStore.get(sessionId);
  if (!progress) return;

  progress.tests = {
    total: results.passed + results.failed + results.skipped,
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped,
    coverage: results.coverage || progress.tests.coverage,
    lastRun: new Date(),
  };

  progress.lastUpdated = new Date();
}

function calculateOverallProgress(progress: DevelopmentProgress): number {
  if (progress.features.length === 0) return 0;

  const totalFeatures = progress.features.length;
  const completedFeatures = progress.features.filter(
    (f) => f.status === "completed"
  ).length;

  const featureProgress = (completedFeatures / totalFeatures) * 100;

  // Weight by components and APIs if any
  const componentProgress =
    progress.components.length > 0
      ? (progress.components.filter((c) => c.status === "verified").length /
          progress.components.length) *
        100
      : 100;

  const apiProgress =
    progress.apis.length > 0
      ? (progress.apis.filter((a) => a.status === "tested").length /
          progress.apis.length) *
        100
      : 100;

  // Weighted average
  return Math.round(
    featureProgress * 0.5 + componentProgress * 0.25 + apiProgress * 0.25
  );
}

function calculateHealth(progress: DevelopmentProgress): "healthy" | "at_risk" | "critical" {
  const unresolvedErrors = progress.errors.unresolved;
  const testFailures = progress.tests.failed;
  const blockers = progress.status.blockers.length;

  if (unresolvedErrors > 20 || testFailures > 10 || blockers > 3) {
    return "critical";
  }
  if (unresolvedErrors > 10 || testFailures > 5 || blockers > 1) {
    return "at_risk";
  }
  return "healthy";
}

// ============================================================================
// ETA Calculation
// ============================================================================

export function calculateETA(sessionId: string): {
  estimatedCompletion: Date;
  confidence: number;
  basedOn: string;
} | null {
  const progress = progressStore.get(sessionId);
  if (!progress || progress.features.length === 0) return null;

  const completedFeatures = progress.features.filter(
    (f) => f.status === "completed" && f.completedAt && f.startedAt
  );

  if (completedFeatures.length === 0) {
    return {
      estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
      confidence: 10,
      basedOn: "No completed features yet",
    };
  }

  // Calculate average time per feature
  const durations = completedFeatures.map(
    (f) => f.completedAt!.getTime() - f.startedAt!.getTime()
  );
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

  // Remaining features
  const remainingFeatures = progress.features.filter(
    (f) => f.status !== "completed"
  ).length;

  // Apply complexity factor
  const remainingComplexity = progress.features
    .filter((f) => f.status !== "completed")
    .reduce((acc, f) => acc + (f.progress < 50 ? 1.5 : 1), 0);

  const estimatedRemaining = avgDuration * remainingComplexity;
  const estimatedCompletion = new Date(Date.now() + estimatedRemaining);

  // Confidence based on sample size
  const confidence = Math.min(90, 20 + completedFeatures.length * 15);

  return {
    estimatedCompletion,
    confidence,
    basedOn: `${completedFeatures.length} completed feature(s), avg ${Math.round(
      avgDuration / 60000
    )} minutes each`,
  };
}

// ============================================================================
// Critical Questions Management
// ============================================================================

const questionStore: Map<string, CriticalQuestion[]> = new Map();

export function addCriticalQuestion(
  sessionId: string,
  question: Omit<CriticalQuestion, "id" | "timestamp" | "answered">
): CriticalQuestion {
  const newQuestion: CriticalQuestion = {
    ...question,
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(),
    answered: false,
  };

  const questions = questionStore.get(sessionId) || [];
  questions.push(newQuestion);
  questionStore.set(sessionId, questions);

  logger.info("Critical question added", {
    sessionId,
    questionId: newQuestion.id,
    priority: newQuestion.priority,
  });

  return newQuestion;
}

export function getPendingQuestions(sessionId: string): CriticalQuestion[] {
  const questions = questionStore.get(sessionId) || [];
  return questions.filter((q) => !q.answered);
}

export function answerQuestion(
  sessionId: string,
  questionId: string,
  answer: string
): CriticalQuestion | null {
  const questions = questionStore.get(sessionId);
  if (!questions) return null;

  const question = questions.find((q) => q.id === questionId);
  if (!question) return null;

  question.answered = true;
  question.answer = answer;

  logger.info("Critical question answered", {
    sessionId,
    questionId,
    answer,
  });

  return question;
}

export function shouldPauseForQuestion(sessionId: string): boolean {
  const pending = getPendingQuestions(sessionId);
  return pending.some((q) => q.priority === "critical");
}

// ============================================================================
// Export All Functions
// ============================================================================

export {
  analyzeDependencies,
  inferDependenciesFromCode,
  runTests,
  runBuild,
  runTypeCheck,
  runLint,
  detectTestFramework,
};
