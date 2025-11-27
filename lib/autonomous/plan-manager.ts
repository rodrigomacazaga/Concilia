// ============================================================================
// Plan Manager - Tracks Development Plans and Architecture Comparison
// ============================================================================

import { logger } from "@/lib/observability/logger";
import {
  DevelopmentPlan,
  DevelopmentTask,
  ArchitectureSpec,
  ArchitectureComponent,
  ApiSpec,
  FileSpec,
  TaskPriority,
} from "./types";

// In-memory storage (would use database in production)
const plans: Map<string, DevelopmentPlan> = new Map();

// ============================================================================
// Plan CRUD
// ============================================================================

export function createPlan(
  projectId: string,
  title: string,
  description: string,
  plannedArchitecture: ArchitectureSpec
): DevelopmentPlan {
  const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const plan: DevelopmentPlan = {
    id,
    projectId,
    title,
    description,
    status: "draft",
    tasks: [],
    plannedArchitecture,
    implementedArchitecture: {
      components: [],
      apis: [],
      files: [],
      dependencies: [],
    },
    progress: {
      total: 0,
      completed: 0,
      failed: 0,
      blocked: 0,
    },
    iterations: [],
    currentIteration: 0,
    maxIterations: 50,
    createdAt: new Date(),
    lastActivityAt: new Date(),
  };

  plans.set(id, plan);
  logger.info("Plan created", { planId: id, title });
  return plan;
}

export function getPlan(planId: string): DevelopmentPlan | null {
  return plans.get(planId) || null;
}

export function getProjectPlans(projectId: string): DevelopmentPlan[] {
  return Array.from(plans.values()).filter((p) => p.projectId === projectId);
}

export function updatePlan(planId: string, updates: Partial<DevelopmentPlan>): DevelopmentPlan | null {
  const plan = plans.get(planId);
  if (!plan) return null;

  Object.assign(plan, updates, { lastActivityAt: new Date() });
  return plan;
}

export function deletePlan(planId: string): boolean {
  return plans.delete(planId);
}

// ============================================================================
// Task Management
// ============================================================================

export function addTask(
  planId: string,
  task: Omit<DevelopmentTask, "id" | "createdAt" | "attempts" | "errors" | "implementedFiles" | "actualChanges" | "testsPassed" | "testsFailed" | "blockedBy">
): DevelopmentTask | null {
  const plan = plans.get(planId);
  if (!plan) return null;

  const newTask: DevelopmentTask = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    implementedFiles: [],
    actualChanges: [],
    testsPassed: [],
    testsFailed: [],
    attempts: 0,
    errors: [],
    blockedBy: [],
    createdAt: new Date(),
  };

  plan.tasks.push(newTask);
  plan.progress.total = plan.tasks.length;
  plan.lastActivityAt = new Date();

  logger.info("Task added", { planId, taskId: newTask.id, title: newTask.title });
  return newTask;
}

export function addTasksFromArchitecture(planId: string): DevelopmentTask[] {
  const plan = plans.get(planId);
  if (!plan) return [];

  const tasks: DevelopmentTask[] = [];

  // Create tasks for each component
  for (const component of plan.plannedArchitecture.components) {
    if (!component.implemented) {
      const task = addTask(planId, {
        title: `Implement ${component.name}`,
        description: `Create ${component.type} at ${component.path}: ${component.description}`,
        type: component.type === "component" ? "feature" : "feature",
        status: "pending",
        priority: determinePriority(component),
        plannedFiles: [component.path],
        plannedChanges: [`Create ${component.type}: ${component.name}`],
        estimatedComplexity: estimateComplexity(component),
        testsRequired: [`${component.name}.test.tsx`],
        dependsOn: [],
        maxAttempts: 3,
      });
      if (task) tasks.push(task);
    }
  }

  // Create tasks for each API
  for (const api of plan.plannedArchitecture.apis) {
    if (!api.implemented) {
      const task = addTask(planId, {
        title: `Implement API ${api.route}`,
        description: `Create API endpoint: ${api.description}`,
        type: "feature",
        status: "pending",
        priority: "high",
        plannedFiles: [`app/api${api.route}/route.ts`],
        plannedChanges: api.methods.map((m) => `Add ${m} handler`),
        estimatedComplexity: api.methods.length > 2 ? 4 : 3,
        testsRequired: [`api${api.route}.test.ts`],
        dependsOn: [],
        maxAttempts: 3,
      });
      if (task) tasks.push(task);
    }
  }

  // Create tasks for additional files
  for (const file of plan.plannedArchitecture.files) {
    if (!file.exists) {
      const task = addTask(planId, {
        title: `Create ${file.path}`,
        description: `Create ${file.type} file`,
        type: file.type === "test" ? "test" : file.type === "doc" ? "docs" : "feature",
        status: "pending",
        priority: file.type === "test" ? "high" : "medium",
        plannedFiles: [file.path],
        plannedChanges: [`Create ${file.type} file: ${file.path}`],
        estimatedComplexity: 2,
        testsRequired: [],
        dependsOn: [],
        maxAttempts: 3,
      });
      if (task) tasks.push(task);
    }
  }

  logger.info("Tasks created from architecture", {
    planId,
    taskCount: tasks.length,
  });

  return tasks;
}

function determinePriority(component: ArchitectureComponent): TaskPriority {
  if (component.type === "api" || component.type === "page") return "high";
  if (component.type === "hook" || component.type === "utility") return "medium";
  return "medium";
}

function estimateComplexity(component: ArchitectureComponent): 1 | 2 | 3 | 4 | 5 {
  if (component.type === "page") return 4;
  if (component.type === "api") return 3;
  if (component.type === "component") return 3;
  if (component.type === "hook") return 2;
  return 2;
}

// ============================================================================
// Architecture Comparison
// ============================================================================

export interface ArchitectureDiff {
  missingComponents: ArchitectureComponent[];
  missingApis: ApiSpec[];
  missingFiles: FileSpec[];
  unverifiedComponents: ArchitectureComponent[];
  untestedApis: ApiSpec[];
  completionPercentage: number;
  summary: string;
}

export async function compareArchitecture(planId: string): Promise<ArchitectureDiff | null> {
  const plan = plans.get(planId);
  if (!plan) return null;

  const diff: ArchitectureDiff = {
    missingComponents: [],
    missingApis: [],
    missingFiles: [],
    unverifiedComponents: [],
    untestedApis: [],
    completionPercentage: 0,
    summary: "",
  };

  let totalItems = 0;
  let implementedItems = 0;

  // Check components
  for (const component of plan.plannedArchitecture.components) {
    totalItems++;
    const exists = await checkFileExists(component.path);

    if (exists) {
      implementedItems++;
      component.implemented = true;

      // Add to implemented architecture if not already there
      const implComponent = plan.implementedArchitecture.components.find(
        (c) => c.path === component.path
      );
      if (!implComponent) {
        plan.implementedArchitecture.components.push({ ...component });
      }

      if (!component.verified) {
        diff.unverifiedComponents.push(component);
      }
    } else {
      component.implemented = false;
      diff.missingComponents.push(component);
    }
  }

  // Check APIs
  for (const api of plan.plannedArchitecture.apis) {
    totalItems++;
    const apiPath = `app/api${api.route}/route.ts`;
    const exists = await checkFileExists(apiPath);

    if (exists) {
      implementedItems++;
      api.implemented = true;

      const implApi = plan.implementedArchitecture.apis.find((a) => a.route === api.route);
      if (!implApi) {
        plan.implementedArchitecture.apis.push({ ...api });
      }

      if (!api.tested) {
        diff.untestedApis.push(api);
      }
    } else {
      api.implemented = false;
      diff.missingApis.push(api);
    }
  }

  // Check files
  for (const file of plan.plannedArchitecture.files) {
    totalItems++;
    const exists = await checkFileExists(file.path);

    if (exists) {
      implementedItems++;
      file.exists = true;

      const implFile = plan.implementedArchitecture.files.find((f) => f.path === file.path);
      if (!implFile) {
        plan.implementedArchitecture.files.push({ ...file });
      }
    } else {
      file.exists = false;
      diff.missingFiles.push(file);
    }
  }

  // Calculate completion
  diff.completionPercentage = totalItems > 0 ? Math.round((implementedItems / totalItems) * 100) : 0;

  // Generate summary
  const missing =
    diff.missingComponents.length + diff.missingApis.length + diff.missingFiles.length;
  const unverified = diff.unverifiedComponents.length + diff.untestedApis.length;

  if (missing === 0 && unverified === 0) {
    diff.summary = "Architecture fully implemented and verified!";
  } else if (missing === 0) {
    diff.summary = `Architecture implemented. ${unverified} items need verification/testing.`;
  } else {
    diff.summary = `${missing} items missing, ${unverified} unverified. ${diff.completionPercentage}% complete.`;
  }

  logger.info("Architecture comparison completed", {
    planId,
    completion: diff.completionPercentage,
    missing,
  });

  return diff;
}

async function checkFileExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// Plan Generation from Description
// ============================================================================

export interface PlanGenerationRequest {
  projectId: string;
  description: string;
  requirements: string[];
  existingFiles?: string[];
}

export function generatePlanFromDescription(request: PlanGenerationRequest): DevelopmentPlan {
  // This would ideally call the LLM to generate a detailed plan
  // For now, we create a basic structure

  const architecture: ArchitectureSpec = {
    components: [],
    apis: [],
    files: [],
    dependencies: [],
  };

  // Parse requirements to identify needed components
  for (const req of request.requirements) {
    const lowerReq = req.toLowerCase();

    // Detect component needs
    if (lowerReq.includes("component") || lowerReq.includes("ui")) {
      const name = extractName(req);
      architecture.components.push({
        name,
        type: "component",
        path: `app/components/${name}.tsx`,
        description: req,
        implemented: false,
        verified: false,
      });
    }

    // Detect API needs
    if (lowerReq.includes("api") || lowerReq.includes("endpoint")) {
      const name = extractName(req);
      architecture.apis.push({
        route: `/${name.toLowerCase()}`,
        methods: ["GET", "POST"],
        description: req,
        implemented: false,
        tested: false,
      });
    }

    // Detect hook needs
    if (lowerReq.includes("hook") || lowerReq.includes("state")) {
      const name = extractName(req);
      architecture.components.push({
        name: `use${name}`,
        type: "hook",
        path: `lib/hooks/use${name}.ts`,
        description: req,
        implemented: false,
        verified: false,
      });
    }
  }

  const plan = createPlan(
    request.projectId,
    `Development Plan: ${request.description.slice(0, 50)}...`,
    request.description,
    architecture
  );

  // Auto-generate tasks
  addTasksFromArchitecture(plan.id);

  return plan;
}

function extractName(text: string): string {
  // Simple extraction - in production, use NLP or LLM
  const words = text.split(/\s+/);
  const meaningfulWords = words.filter(
    (w) =>
      w.length > 3 &&
      !["should", "must", "create", "implement", "component", "api", "endpoint"].includes(
        w.toLowerCase()
      )
  );
  if (meaningfulWords.length > 0) {
    return meaningfulWords[0].charAt(0).toUpperCase() + meaningfulWords[0].slice(1);
  }
  return "Feature" + Date.now().toString().slice(-4);
}

// ============================================================================
// Plan Status & Reporting
// ============================================================================

export interface PlanReport {
  plan: DevelopmentPlan;
  architectureDiff: ArchitectureDiff | null;
  tasksByStatus: Record<string, DevelopmentTask[]>;
  recentErrors: Array<{ taskId: string; error: string; timestamp: Date }>;
  recommendations: string[];
}

export async function generatePlanReport(planId: string): Promise<PlanReport | null> {
  const plan = plans.get(planId);
  if (!plan) return null;

  const diff = await compareArchitecture(planId);

  // Group tasks by status
  const tasksByStatus: Record<string, DevelopmentTask[]> = {
    pending: [],
    in_progress: [],
    testing: [],
    completed: [],
    failed: [],
    blocked: [],
  };

  for (const task of plan.tasks) {
    tasksByStatus[task.status]?.push(task);
  }

  // Collect recent errors
  const recentErrors: Array<{ taskId: string; error: string; timestamp: Date }> = [];
  for (const task of plan.tasks) {
    for (const error of task.errors.slice(-3)) {
      recentErrors.push({
        taskId: task.id,
        error: error.message,
        timestamp: error.timestamp,
      });
    }
  }
  recentErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Generate recommendations
  const recommendations: string[] = [];

  if (diff) {
    if (diff.missingComponents.length > 0) {
      recommendations.push(
        `Complete ${diff.missingComponents.length} missing components before proceeding.`
      );
    }
    if (diff.untestedApis.length > 0) {
      recommendations.push(`Add tests for ${diff.untestedApis.length} untested APIs.`);
    }
  }

  if (tasksByStatus.failed.length > 0) {
    recommendations.push(
      `Review ${tasksByStatus.failed.length} failed tasks for common error patterns.`
    );
  }

  if (tasksByStatus.blocked.length > 0) {
    recommendations.push(
      `Resolve dependencies for ${tasksByStatus.blocked.length} blocked tasks.`
    );
  }

  return {
    plan,
    architectureDiff: diff,
    tasksByStatus,
    recentErrors: recentErrors.slice(0, 10),
    recommendations,
  };
}

// ============================================================================
// Export all plans (for persistence)
// ============================================================================

export function exportPlans(): DevelopmentPlan[] {
  return Array.from(plans.values());
}

export function importPlans(importedPlans: DevelopmentPlan[]): void {
  plans.clear();
  for (const plan of importedPlans) {
    plans.set(plan.id, plan);
  }
}
