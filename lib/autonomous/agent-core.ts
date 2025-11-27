// ============================================================================
// Autonomous Agent Core - Main Execution Engine
// ============================================================================

import { logger } from "@/lib/observability/logger";
import {
  AgentState,
  AgentStatus,
  AgentConfig,
  AgentEvent,
  AgentEventListener,
  DevelopmentPlan,
  DevelopmentTask,
  PlanIteration,
  TaskError,
  RecoveryAction,
  RecoveryTrigger,
  ActivityLogEntry,
  BuildResult,
  TestResult,
} from "./types";

// Default configuration
const DEFAULT_CONFIG: AgentConfig = {
  maxIterations: 50,
  maxTaskAttempts: 3,
  testBeforeCommit: true,
  buildBeforeCommit: true,
  autoRecovery: true,
  watchdogInterval: 30000,      // 30 seconds
  healthCheckInterval: 10000,   // 10 seconds
  taskTimeout: 300000,          // 5 minutes
  recoveryStrategies: [
    {
      trigger: "build_failure",
      actions: ["analyze_errors", "fix_imports", "fix_types", "retry_build"],
      maxAttempts: 3,
      cooldown: 5000,
    },
    {
      trigger: "test_failure",
      actions: ["analyze_test_errors", "fix_assertions", "retry_tests"],
      maxAttempts: 3,
      cooldown: 5000,
    },
    {
      trigger: "runtime_error",
      actions: ["check_logs", "analyze_stack", "apply_fix", "restart"],
      maxAttempts: 3,
      cooldown: 10000,
    },
    {
      trigger: "timeout",
      actions: ["kill_process", "cleanup", "retry_task"],
      maxAttempts: 2,
      cooldown: 15000,
    },
  ],
};

// Singleton agent instance
let agentInstance: AutonomousAgent | null = null;

export class AutonomousAgent {
  private state: AgentState;
  private listeners: Set<AgentEventListener> = new Set();
  private watchdogTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private taskTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: Partial<AgentConfig> = {}) {
    this.state = {
      status: "idle",
      isHealthy: true,
      lastHealthCheck: new Date(),
      consecutiveFailures: 0,
      lastActivity: new Date(),
      activityLog: [],
      config: { ...DEFAULT_CONFIG, ...config },
    };

    this.log("info", "Autonomous agent initialized");
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start executing a development plan
   */
  async startPlan(plan: DevelopmentPlan): Promise<void> {
    if (this.isRunning) {
      throw new Error("Agent is already running a plan");
    }

    this.state.currentPlan = plan;
    this.state.status = "planning";
    this.isRunning = true;

    this.emit({ type: "PLAN_STARTED", planId: plan.id });
    this.log("milestone", `Started plan: ${plan.title}`);

    // Start timers
    this.startWatchdog();
    this.startHealthCheck();

    // Begin execution loop
    await this.executionLoop();
  }

  /**
   * Pause the current execution
   */
  pause(): void {
    if (!this.isRunning) return;

    this.state.status = "paused";
    this.isRunning = false;
    this.clearTimers();

    this.emit({ type: "AGENT_PAUSED" });
    this.log("info", "Agent paused");
  }

  /**
   * Resume execution
   */
  async resume(): Promise<void> {
    if (this.state.status !== "paused") {
      throw new Error("Agent is not paused");
    }

    this.state.status = "developing";
    this.isRunning = true;

    this.emit({ type: "AGENT_RESUMED" });
    this.log("info", "Agent resumed");

    this.startWatchdog();
    this.startHealthCheck();
    await this.executionLoop();
  }

  /**
   * Stop execution completely
   */
  stop(): void {
    this.isRunning = false;
    this.clearTimers();
    this.state.status = "idle";
    this.log("info", "Agent stopped");
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Subscribe to events
   */
  subscribe(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Trigger manual recovery
   */
  async triggerRecovery(reason: string): Promise<void> {
    this.log("recovery", `Manual recovery triggered: ${reason}`);
    await this.recover("manual");
  }

  // ============================================================================
  // Main Execution Loop
  // ============================================================================

  private async executionLoop(): Promise<void> {
    const plan = this.state.currentPlan;
    if (!plan) return;

    while (this.isRunning && plan.currentIteration < plan.maxIterations) {
      try {
        // Start new iteration
        const iteration = this.startIteration(plan);
        this.emit({ type: "ITERATION_STARTED", iteration: iteration.number });

        // Get next task
        const task = this.getNextTask(plan);
        if (!task) {
          // All tasks completed
          this.completePlan(plan);
          return;
        }

        // Execute task
        this.state.currentTask = task;
        this.state.status = "developing";
        await this.executeTask(task, plan);

        // Run tests if configured
        if (this.state.config.testBeforeCommit) {
          this.state.status = "testing";
          const testResult = await this.runTests();
          iteration.testResult = testResult;

          if (!testResult.success) {
            iteration.tasksFailed.push(task.id);
            await this.handleTestFailure(task, testResult, plan);
            continue;
          }
        }

        // Run build if configured
        if (this.state.config.buildBeforeCommit) {
          const buildResult = await this.runBuild();
          iteration.buildResult = buildResult;

          if (!buildResult.success) {
            iteration.tasksFailed.push(task.id);
            await this.handleBuildFailure(task, buildResult, plan);
            continue;
          }
        }

        // Task completed successfully
        this.completeTask(task);
        iteration.tasksCompleted.push(task.id);
        iteration.status = "success";

        // Update progress
        this.updateProgress(plan);

      } catch (error) {
        this.state.consecutiveFailures++;
        logger.error("Iteration error", error);

        if (this.state.config.autoRecovery) {
          await this.recover("runtime_error");
        }

        if (this.state.consecutiveFailures >= 3) {
          this.failPlan(plan, "Too many consecutive failures");
          return;
        }
      }

      // Brief pause between iterations
      await this.sleep(1000);
    }

    // Max iterations reached
    if (plan.currentIteration >= plan.maxIterations) {
      this.failPlan(plan, "Max iterations reached");
    }
  }

  // ============================================================================
  // Task Execution
  // ============================================================================

  private async executeTask(
    task: DevelopmentTask,
    plan: DevelopmentPlan
  ): Promise<void> {
    task.status = "in_progress";
    task.attempts++;
    task.startedAt = task.startedAt || new Date();

    this.emit({ type: "TASK_STARTED", taskId: task.id });
    this.log("action", `Executing task: ${task.title}`);

    // Set timeout for task
    const timeoutPromise = new Promise<never>((_, reject) => {
      this.taskTimer = setTimeout(() => {
        reject(new Error("Task timeout"));
      }, this.state.config.taskTimeout);
    });

    try {
      // Execute based on task type
      const executionPromise = this.performTaskExecution(task, plan);
      await Promise.race([executionPromise, timeoutPromise]);

    } finally {
      if (this.taskTimer) {
        clearTimeout(this.taskTimer);
        this.taskTimer = undefined;
      }
    }
  }

  private async performTaskExecution(
    task: DevelopmentTask,
    plan: DevelopmentPlan
  ): Promise<void> {
    // This is where the actual development happens
    // In a real implementation, this would call the LLM to generate code

    // For now, we'll call the dev-chat API to perform the development
    const prompt = this.buildTaskPrompt(task, plan);

    const response = await fetch("/api/dev-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        projectId: plan.projectId,
        mode: "execute",
      }),
    });

    if (!response.ok) {
      throw new Error(`Dev chat failed: ${response.statusText}`);
    }

    // Process the response (streaming)
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += decoder.decode(value, { stream: true });
    }

    // Parse and validate the implementation
    await this.validateImplementation(task, fullResponse);
  }

  private buildTaskPrompt(task: DevelopmentTask, plan: DevelopmentPlan): string {
    const context = `
## Current Development Plan
Title: ${plan.title}
Progress: ${plan.progress.completed}/${plan.progress.total} tasks completed

## Current Task
ID: ${task.id}
Title: ${task.title}
Description: ${task.description}
Type: ${task.type}
Priority: ${task.priority}

## Planned Files
${task.plannedFiles.map((f) => `- ${f}`).join("\n")}

## Planned Changes
${task.plannedChanges.map((c) => `- ${c}`).join("\n")}

## Previous Errors (if any)
${task.errors.map((e) => `- [${e.type}] ${e.message}`).join("\n") || "None"}

## Instructions
1. Implement the changes described above
2. Follow the existing code patterns and conventions
3. Ensure all imports are correct
4. Handle errors appropriately
5. Add necessary tests if applicable

Please implement this task now.
`;
    return context;
  }

  private async validateImplementation(
    task: DevelopmentTask,
    response: string
  ): Promise<void> {
    // Validate that files were created/modified as expected
    for (const file of task.plannedFiles) {
      const exists = await this.checkFileExists(file);
      if (exists && !task.implementedFiles.includes(file)) {
        task.implementedFiles.push(file);
      }
    }

    this.log("info", `Validated implementation for task: ${task.title}`);
  }

  private async checkFileExists(path: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Build & Test
  // ============================================================================

  private async runBuild(): Promise<BuildResult> {
    this.emit({ type: "BUILD_STARTED" });
    this.log("action", "Running build...");

    const startTime = Date.now();

    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "npm run build" }),
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      const buildResult: BuildResult = {
        success: result.exitCode === 0,
        timestamp: new Date(),
        duration,
        errors: this.parseErrors(result.stderr || ""),
        warnings: this.parseWarnings(result.stdout || ""),
      };

      this.emit({ type: "BUILD_COMPLETED", result: buildResult });
      this.log(
        buildResult.success ? "info" : "error",
        `Build ${buildResult.success ? "succeeded" : "failed"} in ${duration}ms`
      );

      return buildResult;
    } catch (error) {
      const buildResult: BuildResult = {
        success: false,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        warnings: [],
      };

      this.emit({ type: "BUILD_COMPLETED", result: buildResult });
      return buildResult;
    }
  }

  private async runTests(): Promise<TestResult> {
    this.emit({ type: "TEST_STARTED" });
    this.log("action", "Running tests...");

    const startTime = Date.now();

    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "npm test -- --passWithNoTests" }),
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      // Parse test output
      const { passed, failed, skipped } = this.parseTestOutput(result.stdout || "");

      const testResult: TestResult = {
        success: result.exitCode === 0,
        timestamp: new Date(),
        duration,
        passed,
        failed,
        skipped,
        errors: this.parseErrors(result.stderr || ""),
      };

      this.emit({ type: "TEST_COMPLETED", result: testResult });
      this.log(
        testResult.success ? "info" : "error",
        `Tests ${testResult.success ? "passed" : "failed"}: ${passed} passed, ${failed} failed`
      );

      return testResult;
    } catch (error) {
      const testResult: TestResult = {
        success: false,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };

      this.emit({ type: "TEST_COMPLETED", result: testResult });
      return testResult;
    }
  }

  private parseErrors(output: string): string[] {
    const errors: string[] = [];
    const errorPatterns = [
      /error[:\s]+(.+)/gi,
      /Error:\s*(.+)/g,
      /failed:\s*(.+)/gi,
    ];

    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        errors.push(match[1].trim());
      }
    }

    return [...new Set(errors)].slice(0, 20); // Dedupe and limit
  }

  private parseWarnings(output: string): string[] {
    const warnings: string[] = [];
    const warningPattern = /warning[:\s]+(.+)/gi;

    let match;
    while ((match = warningPattern.exec(output)) !== null) {
      warnings.push(match[1].trim());
    }

    return [...new Set(warnings)].slice(0, 20);
  }

  private parseTestOutput(output: string): { passed: number; failed: number; skipped: number } {
    // Parse Jest/Vitest output
    const passedMatch = output.match(/(\d+)\s+pass/i);
    const failedMatch = output.match(/(\d+)\s+fail/i);
    const skippedMatch = output.match(/(\d+)\s+skip/i);

    return {
      passed: passedMatch ? parseInt(passedMatch[1], 10) : 0,
      failed: failedMatch ? parseInt(failedMatch[1], 10) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1], 10) : 0,
    };
  }

  // ============================================================================
  // Failure Handling
  // ============================================================================

  private async handleBuildFailure(
    task: DevelopmentTask,
    buildResult: BuildResult,
    plan: DevelopmentPlan
  ): Promise<void> {
    const error: TaskError = {
      id: `err-${Date.now()}`,
      taskId: task.id,
      timestamp: new Date(),
      type: "build",
      message: `Build failed: ${buildResult.errors.join(", ")}`,
      resolved: false,
    };

    task.errors.push(error);
    this.log("error", `Build failure on task ${task.id}: ${error.message}`);

    if (this.state.config.autoRecovery && task.attempts < task.maxAttempts) {
      await this.recover("build_failure");
    } else {
      task.status = "failed";
      this.emit({ type: "TASK_FAILED", taskId: task.id, error });
    }
  }

  private async handleTestFailure(
    task: DevelopmentTask,
    testResult: TestResult,
    plan: DevelopmentPlan
  ): Promise<void> {
    const error: TaskError = {
      id: `err-${Date.now()}`,
      taskId: task.id,
      timestamp: new Date(),
      type: "test",
      message: `Tests failed: ${testResult.failed} failures`,
      context: { errors: testResult.errors },
      resolved: false,
    };

    task.errors.push(error);
    this.log("error", `Test failure on task ${task.id}: ${error.message}`);

    if (this.state.config.autoRecovery && task.attempts < task.maxAttempts) {
      await this.recover("test_failure");
    } else {
      task.status = "failed";
      this.emit({ type: "TASK_FAILED", taskId: task.id, error });
    }
  }

  // ============================================================================
  // Recovery System
  // ============================================================================

  private async recover(trigger: RecoveryTrigger): Promise<void> {
    this.state.status = "recovering";
    this.emit({ type: "RECOVERY_TRIGGERED", trigger });
    this.log("recovery", `Recovery triggered: ${trigger}`);

    const strategy = this.state.config.recoveryStrategies.find(
      (s) => s.trigger === trigger
    );

    if (!strategy) {
      this.log("error", `No recovery strategy for trigger: ${trigger}`);
      this.emit({ type: "RECOVERY_COMPLETED", success: false });
      return;
    }

    const action: RecoveryAction = {
      id: `recovery-${Date.now()}`,
      timestamp: new Date(),
      trigger,
      action: strategy.actions.join(" -> "),
      result: "pending",
    };

    try {
      // Execute recovery actions in sequence
      for (const actionName of strategy.actions) {
        await this.executeRecoveryAction(actionName);
        await this.sleep(strategy.cooldown);
      }

      action.result = "success";
      this.state.consecutiveFailures = 0;
      this.log("recovery", "Recovery successful");
      this.emit({ type: "RECOVERY_COMPLETED", success: true });

    } catch (error) {
      action.result = "failed";
      action.details = error instanceof Error ? error.message : "Unknown error";
      this.log("error", `Recovery failed: ${action.details}`);
      this.emit({ type: "RECOVERY_COMPLETED", success: false });
    }

    // Add to current iteration
    const plan = this.state.currentPlan;
    if (plan && plan.iterations.length > 0) {
      plan.iterations[plan.iterations.length - 1].recoveryActions.push(action);
    }
  }

  private async executeRecoveryAction(action: string): Promise<void> {
    this.log("action", `Executing recovery action: ${action}`);

    switch (action) {
      case "analyze_errors":
        await this.analyzeErrors();
        break;
      case "analyze_test_errors":
        await this.analyzeTestErrors();
        break;
      case "fix_imports":
        await this.fixImports();
        break;
      case "fix_types":
        await this.fixTypes();
        break;
      case "fix_assertions":
        await this.fixAssertions();
        break;
      case "retry_build":
        await this.runBuild();
        break;
      case "retry_tests":
        await this.runTests();
        break;
      case "check_logs":
        await this.checkLogs();
        break;
      case "analyze_stack":
        await this.analyzeStack();
        break;
      case "apply_fix":
        await this.applyFix();
        break;
      case "restart":
        await this.restart();
        break;
      case "kill_process":
        await this.killProcess();
        break;
      case "cleanup":
        await this.cleanup();
        break;
      case "retry_task":
        // Will be handled by the main loop
        break;
      default:
        this.log("info", `Unknown recovery action: ${action}`);
    }
  }

  private async analyzeErrors(): Promise<void> {
    const logs = await this.fetchLogs("error");
    this.log("info", `Analyzing ${logs.length} error logs`);
    // Analysis would happen here - in production, send to LLM
  }

  private async analyzeTestErrors(): Promise<void> {
    const task = this.state.currentTask;
    if (!task) return;

    const testErrors = task.testsFailed;
    this.log("info", `Analyzing ${testErrors.length} test failures`);
  }

  private async fixImports(): Promise<void> {
    // Would analyze and fix import errors
    this.log("info", "Attempting to fix imports");
  }

  private async fixTypes(): Promise<void> {
    // Would analyze and fix type errors
    this.log("info", "Attempting to fix type errors");
  }

  private async fixAssertions(): Promise<void> {
    // Would analyze and fix test assertions
    this.log("info", "Attempting to fix test assertions");
  }

  private async checkLogs(): Promise<void> {
    const logs = await this.fetchLogs();
    this.log("info", `Checked ${logs.length} recent logs`);
  }

  private async analyzeStack(): Promise<void> {
    const task = this.state.currentTask;
    if (!task || task.errors.length === 0) return;

    const lastError = task.errors[task.errors.length - 1];
    if (lastError.stack) {
      this.log("info", `Analyzing stack trace: ${lastError.stack.slice(0, 200)}...`);
    }
  }

  private async applyFix(): Promise<void> {
    // Would apply automatic fix based on analysis
    this.log("info", "Applying automatic fix");
  }

  private async restart(): Promise<void> {
    // Soft restart - clear state and retry
    this.log("info", "Performing soft restart");
    this.state.consecutiveFailures = 0;
  }

  private async killProcess(): Promise<void> {
    // Kill any hanging processes
    this.log("info", "Killing hanging processes");
  }

  private async cleanup(): Promise<void> {
    // Clean up temporary files, etc.
    this.log("info", "Cleaning up");
  }

  private async fetchLogs(level?: string): Promise<unknown[]> {
    try {
      const url = level
        ? `/api/observability/logs?level=${level}`
        : "/api/observability/logs";
      const response = await fetch(url);
      const data = await response.json();
      return data.logs || [];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Health & Watchdog
  // ============================================================================

  private startWatchdog(): void {
    this.watchdogTimer = setInterval(() => {
      this.watchdog();
    }, this.state.config.watchdogInterval);
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.healthCheck();
    }, this.state.config.healthCheckInterval);
  }

  private clearTimers(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = undefined;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    if (this.taskTimer) {
      clearTimeout(this.taskTimer);
      this.taskTimer = undefined;
    }
  }

  private watchdog(): void {
    const now = Date.now();
    const lastActivity = this.state.lastActivity.getTime();
    const inactiveTime = now - lastActivity;

    // If inactive for more than 2x watchdog interval, trigger recovery
    if (inactiveTime > this.state.config.watchdogInterval * 2) {
      this.log("error", `Watchdog: Inactivity detected (${inactiveTime}ms)`);
      if (this.state.config.autoRecovery) {
        this.recover("watchdog").catch((e) => logger.error("Watchdog recovery failed", e));
      }
    }
  }

  private healthCheck(): void {
    this.state.lastHealthCheck = new Date();
    const isHealthy = this.state.consecutiveFailures < 3;
    this.state.isHealthy = isHealthy;
    this.emit({ type: "HEALTH_CHECK", healthy: isHealthy });
  }

  // ============================================================================
  // Plan & Task Management
  // ============================================================================

  private startIteration(plan: DevelopmentPlan): PlanIteration {
    plan.currentIteration++;
    const iteration: PlanIteration = {
      number: plan.currentIteration,
      startedAt: new Date(),
      status: "running",
      tasksAttempted: [],
      tasksCompleted: [],
      tasksFailed: [],
      errors: [],
      recoveryActions: [],
    };
    plan.iterations.push(iteration);
    plan.lastActivityAt = new Date();
    return iteration;
  }

  private getNextTask(plan: DevelopmentPlan): DevelopmentTask | null {
    // Find first pending task that's not blocked
    for (const task of plan.tasks) {
      if (task.status === "pending" && !this.isTaskBlocked(task, plan)) {
        return task;
      }
    }

    // Check for failed tasks that can be retried
    for (const task of plan.tasks) {
      if (task.status === "failed" && task.attempts < task.maxAttempts) {
        task.status = "pending";
        return task;
      }
    }

    return null;
  }

  private isTaskBlocked(task: DevelopmentTask, plan: DevelopmentPlan): boolean {
    for (const depId of task.dependsOn) {
      const dep = plan.tasks.find((t) => t.id === depId);
      if (dep && dep.status !== "completed") {
        if (!task.blockedBy.includes(depId)) {
          task.blockedBy.push(depId);
        }
        return true;
      }
    }
    task.blockedBy = [];
    return false;
  }

  private completeTask(task: DevelopmentTask): void {
    task.status = "completed";
    task.completedAt = new Date();
    this.emit({ type: "TASK_COMPLETED", taskId: task.id });
    this.log("milestone", `Task completed: ${task.title}`);
  }

  private updateProgress(plan: DevelopmentPlan): void {
    plan.progress = {
      total: plan.tasks.length,
      completed: plan.tasks.filter((t) => t.status === "completed").length,
      failed: plan.tasks.filter((t) => t.status === "failed").length,
      blocked: plan.tasks.filter((t) => t.blockedBy.length > 0).length,
    };
  }

  private completePlan(plan: DevelopmentPlan): void {
    plan.status = "completed";
    plan.completedAt = new Date();
    this.state.status = "completed";
    this.isRunning = false;
    this.clearTimers();

    this.emit({ type: "PLAN_COMPLETED", planId: plan.id });
    this.log("milestone", `Plan completed: ${plan.title}`);
  }

  private failPlan(plan: DevelopmentPlan, reason: string): void {
    plan.status = "failed";
    this.state.status = "failed";
    this.isRunning = false;
    this.clearTimers();

    this.emit({ type: "PLAN_FAILED", planId: plan.id, reason });
    this.log("error", `Plan failed: ${reason}`);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private log(
    type: ActivityLogEntry["type"],
    message: string,
    details?: Record<string, unknown>
  ): void {
    const entry: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      details,
    };

    this.state.activityLog.push(entry);
    this.state.lastActivity = new Date();

    // Keep only last 1000 entries
    if (this.state.activityLog.length > 1000) {
      this.state.activityLog = this.state.activityLog.slice(-1000);
    }

    // Also log to observability system
    switch (type) {
      case "error":
        logger.error(message, undefined, details);
        break;
      case "recovery":
        logger.warn(message, details);
        break;
      default:
        logger.info(message, details);
    }
  }

  private emit(event: AgentEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        logger.error("Event listener error", e);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Management
// ============================================================================

export function getAgent(): AutonomousAgent {
  if (!agentInstance) {
    agentInstance = new AutonomousAgent();
  }
  return agentInstance;
}

export function resetAgent(): void {
  if (agentInstance) {
    agentInstance.stop();
  }
  agentInstance = new AutonomousAgent();
}
