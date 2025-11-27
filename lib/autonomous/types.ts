// ============================================================================
// Autonomous Agent System - Types
// ============================================================================

export type AgentStatus =
  | "idle"           // No active task
  | "planning"       // Creating development plan
  | "developing"     // Writing code
  | "testing"        // Running tests/build
  | "reviewing"      // Reviewing errors/logs
  | "recovering"     // Self-healing from failure
  | "paused"         // Manually paused
  | "completed"      // Successfully completed
  | "failed";        // Unrecoverable failure

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "testing"
  | "completed"
  | "failed"
  | "blocked";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface DevelopmentTask {
  id: string;
  title: string;
  description: string;
  type: "feature" | "bugfix" | "refactor" | "test" | "docs";
  status: TaskStatus;
  priority: TaskPriority;

  // Planning
  plannedFiles: string[];
  plannedChanges: string[];
  estimatedComplexity: 1 | 2 | 3 | 4 | 5;

  // Implementation
  implementedFiles: string[];
  actualChanges: string[];

  // Testing
  testsRequired: string[];
  testsPassed: string[];
  testsFailed: string[];

  // Tracking
  attempts: number;
  maxAttempts: number;
  errors: TaskError[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Dependencies
  dependsOn: string[];
  blockedBy: string[];
}

export interface TaskError {
  id: string;
  taskId: string;
  timestamp: Date;
  type: "build" | "test" | "runtime" | "validation" | "timeout";
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  resolved: boolean;
  resolution?: string;
}

export interface DevelopmentPlan {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "draft" | "active" | "paused" | "completed" | "failed";

  // Tasks
  tasks: DevelopmentTask[];
  currentTaskId?: string;

  // Architecture
  plannedArchitecture: ArchitectureSpec;
  implementedArchitecture: ArchitectureSpec;

  // Progress
  progress: {
    total: number;
    completed: number;
    failed: number;
    blocked: number;
  };

  // Iterations
  iterations: PlanIteration[];
  currentIteration: number;
  maxIterations: number;

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  lastActivityAt: Date;
}

export interface ArchitectureSpec {
  components: ArchitectureComponent[];
  apis: ApiSpec[];
  files: FileSpec[];
  dependencies: string[];
}

export interface ArchitectureComponent {
  name: string;
  type: "component" | "hook" | "utility" | "api" | "page";
  path: string;
  description: string;
  implemented: boolean;
  verified: boolean;
}

export interface ApiSpec {
  route: string;
  methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
  description: string;
  implemented: boolean;
  tested: boolean;
}

export interface FileSpec {
  path: string;
  type: "component" | "api" | "lib" | "config" | "test" | "doc";
  exists: boolean;
  content?: string;
}

export interface PlanIteration {
  number: number;
  startedAt: Date;
  completedAt?: Date;
  status: "running" | "success" | "failed" | "partial";

  tasksAttempted: string[];
  tasksCompleted: string[];
  tasksFailed: string[];

  buildResult?: BuildResult;
  testResult?: TestResult;

  errors: TaskError[];
  recoveryActions: RecoveryAction[];
}

export interface BuildResult {
  success: boolean;
  timestamp: Date;
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface TestResult {
  success: boolean;
  timestamp: Date;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface RecoveryAction {
  id: string;
  timestamp: Date;
  trigger: RecoveryTrigger;
  action: string;
  result: "success" | "failed" | "pending";
  details?: string;
}

export type RecoveryTrigger =
  | "build_failure"
  | "test_failure"
  | "runtime_error"
  | "timeout"
  | "manual"
  | "health_check"
  | "watchdog";

export interface AgentState {
  status: AgentStatus;
  currentPlan?: DevelopmentPlan;
  currentTask?: DevelopmentTask;

  // Health
  isHealthy: boolean;
  lastHealthCheck: Date;
  consecutiveFailures: number;

  // Activity
  lastActivity: Date;
  activityLog: ActivityLogEntry[];

  // Configuration
  config: AgentConfig;
}

export interface AgentConfig {
  maxIterations: number;
  maxTaskAttempts: number;
  testBeforeCommit: boolean;
  buildBeforeCommit: boolean;
  autoRecovery: boolean;
  watchdogInterval: number;     // ms
  healthCheckInterval: number;  // ms
  taskTimeout: number;          // ms
  recoveryStrategies: RecoveryStrategy[];
}

export interface RecoveryStrategy {
  trigger: RecoveryTrigger;
  actions: string[];
  maxAttempts: number;
  cooldown: number;  // ms before retry
}

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "action" | "error" | "recovery" | "milestone";
  message: string;
  details?: Record<string, unknown>;
}

// Events
export type AgentEvent =
  | { type: "PLAN_CREATED"; plan: DevelopmentPlan }
  | { type: "PLAN_STARTED"; planId: string }
  | { type: "PLAN_COMPLETED"; planId: string }
  | { type: "PLAN_FAILED"; planId: string; reason: string }
  | { type: "TASK_STARTED"; taskId: string }
  | { type: "TASK_COMPLETED"; taskId: string }
  | { type: "TASK_FAILED"; taskId: string; error: TaskError }
  | { type: "ITERATION_STARTED"; iteration: number }
  | { type: "ITERATION_COMPLETED"; iteration: number; status: string }
  | { type: "BUILD_STARTED" }
  | { type: "BUILD_COMPLETED"; result: BuildResult }
  | { type: "TEST_STARTED" }
  | { type: "TEST_COMPLETED"; result: TestResult }
  | { type: "RECOVERY_TRIGGERED"; trigger: RecoveryTrigger }
  | { type: "RECOVERY_COMPLETED"; success: boolean }
  | { type: "AGENT_PAUSED" }
  | { type: "AGENT_RESUMED" }
  | { type: "HEALTH_CHECK"; healthy: boolean };

export type AgentEventListener = (event: AgentEvent) => void;
