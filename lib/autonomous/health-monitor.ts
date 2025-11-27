// ============================================================================
// Health Monitor - Auto-triggers for Agent Recovery
// ============================================================================

import { logger } from "@/lib/observability/logger";
import { getAgent } from "./agent-core";
import { AgentEvent, RecoveryTrigger } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface HealthStatus {
  overall: "healthy" | "degraded" | "unhealthy" | "critical";
  checks: HealthCheck[];
  lastUpdated: Date;
  uptime: number;
  consecutiveFailures: number;
}

export interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  lastCheck: Date;
  responseTime?: number;
}

export interface Trigger {
  id: string;
  name: string;
  type: TriggerType;
  condition: TriggerCondition;
  action: TriggerAction;
  enabled: boolean;
  cooldown: number;
  lastTriggered?: Date;
  triggerCount: number;
}

export type TriggerType =
  | "health"
  | "error_rate"
  | "inactivity"
  | "build_failure"
  | "test_failure"
  | "memory"
  | "custom";

export interface TriggerCondition {
  type: string;
  threshold?: number;
  duration?: number;
  pattern?: string;
}

export interface TriggerAction {
  type: "restart" | "recover" | "notify" | "pause" | "escalate";
  params?: Record<string, unknown>;
}

// ============================================================================
// Health Monitor Class
// ============================================================================

class HealthMonitor {
  private status: HealthStatus;
  private triggers: Map<string, Trigger> = new Map();
  private checkInterval?: NodeJS.Timeout;
  private triggerCheckInterval?: NodeJS.Timeout;
  private startTime: Date;
  private errorBuffer: Array<{ timestamp: Date; type: string }> = [];

  constructor() {
    this.startTime = new Date();
    this.status = {
      overall: "healthy",
      checks: [],
      lastUpdated: new Date(),
      uptime: 0,
      consecutiveFailures: 0,
    };

    // Initialize default triggers
    this.initializeDefaultTriggers();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  start(interval = 10000): void {
    logger.info("Health monitor started", { interval });

    // Run health checks periodically
    this.checkInterval = setInterval(() => {
      this.runHealthChecks();
    }, interval);

    // Check triggers more frequently
    this.triggerCheckInterval = setInterval(() => {
      this.evaluateTriggers();
    }, interval / 2);

    // Subscribe to agent events
    const agent = getAgent();
    agent.subscribe(this.handleAgentEvent.bind(this));

    // Initial check
    this.runHealthChecks();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    if (this.triggerCheckInterval) {
      clearInterval(this.triggerCheckInterval);
      this.triggerCheckInterval = undefined;
    }
    logger.info("Health monitor stopped");
  }

  getStatus(): HealthStatus {
    return { ...this.status };
  }

  getTriggers(): Trigger[] {
    return Array.from(this.triggers.values());
  }

  addTrigger(trigger: Omit<Trigger, "id" | "triggerCount">): Trigger {
    const id = `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newTrigger: Trigger = {
      ...trigger,
      id,
      triggerCount: 0,
    };
    this.triggers.set(id, newTrigger);
    logger.info("Trigger added", { id, name: trigger.name });
    return newTrigger;
  }

  removeTrigger(id: string): boolean {
    return this.triggers.delete(id);
  }

  enableTrigger(id: string): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = true;
    }
  }

  disableTrigger(id: string): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = false;
    }
  }

  // ============================================================================
  // Health Checks
  // ============================================================================

  private async runHealthChecks(): Promise<void> {
    const checks: HealthCheck[] = [];

    // Check agent status
    checks.push(await this.checkAgentHealth());

    // Check API health
    checks.push(await this.checkApiHealth());

    // Check error rate
    checks.push(this.checkErrorRate());

    // Check memory (simulated)
    checks.push(this.checkMemory());

    // Check build status
    checks.push(await this.checkBuildStatus());

    // Update status
    this.status.checks = checks;
    this.status.lastUpdated = new Date();
    this.status.uptime = Date.now() - this.startTime.getTime();

    // Determine overall status
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;

    if (failCount >= 2) {
      this.status.overall = "critical";
    } else if (failCount === 1) {
      this.status.overall = "unhealthy";
    } else if (warnCount >= 2) {
      this.status.overall = "degraded";
    } else {
      this.status.overall = "healthy";
    }

    // Update consecutive failures
    if (this.status.overall === "critical" || this.status.overall === "unhealthy") {
      this.status.consecutiveFailures++;
    } else {
      this.status.consecutiveFailures = 0;
    }
  }

  private async checkAgentHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      const agent = getAgent();
      const state = agent.getState();

      const status =
        state.isHealthy && state.consecutiveFailures < 3
          ? "pass"
          : state.consecutiveFailures < 5
          ? "warn"
          : "fail";

      return {
        name: "Agent Health",
        status,
        message:
          status === "pass"
            ? "Agent is healthy"
            : `Agent has ${state.consecutiveFailures} consecutive failures`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: "Agent Health",
        status: "fail",
        message: `Agent check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkApiHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          name: "API Health",
          status: responseTime > 2000 ? "warn" : "pass",
          message: responseTime > 2000 ? "API slow" : "API healthy",
          lastCheck: new Date(),
          responseTime,
        };
      } else {
        return {
          name: "API Health",
          status: "fail",
          message: `API returned ${response.status}`,
          lastCheck: new Date(),
          responseTime,
        };
      }
    } catch (error) {
      return {
        name: "API Health",
        status: "fail",
        message: `API check failed: ${error instanceof Error ? error.message : "Timeout"}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private checkErrorRate(): HealthCheck {
    // Calculate error rate from buffer (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentErrors = this.errorBuffer.filter(
      (e) => e.timestamp.getTime() > fiveMinutesAgo
    );

    const errorRate = recentErrors.length;

    let status: "pass" | "warn" | "fail" = "pass";
    let message = "Error rate normal";

    if (errorRate > 20) {
      status = "fail";
      message = `High error rate: ${errorRate} errors in 5 minutes`;
    } else if (errorRate > 10) {
      status = "warn";
      message = `Elevated error rate: ${errorRate} errors in 5 minutes`;
    }

    return {
      name: "Error Rate",
      status,
      message,
      lastCheck: new Date(),
    };
  }

  private checkMemory(): HealthCheck {
    // In a real implementation, this would check actual memory usage
    // For now, simulate based on activity
    const agent = getAgent();
    const state = agent.getState();
    const activityLogSize = state.activityLog.length;

    let status: "pass" | "warn" | "fail" = "pass";
    let message = "Memory usage normal";

    if (activityLogSize > 800) {
      status = "fail";
      message = "Memory usage critical (activity log size: " + activityLogSize + ")";
    } else if (activityLogSize > 500) {
      status = "warn";
      message = "Memory usage elevated (activity log size: " + activityLogSize + ")";
    }

    return {
      name: "Memory",
      status,
      message,
      lastCheck: new Date(),
    };
  }

  private async checkBuildStatus(): Promise<HealthCheck> {
    const agent = getAgent();
    const state = agent.getState();
    const plan = state.currentPlan;

    if (!plan || plan.iterations.length === 0) {
      return {
        name: "Build Status",
        status: "pass",
        message: "No recent builds",
        lastCheck: new Date(),
      };
    }

    const lastIteration = plan.iterations[plan.iterations.length - 1];
    const buildResult = lastIteration.buildResult;

    if (!buildResult) {
      return {
        name: "Build Status",
        status: "pass",
        message: "No build in current iteration",
        lastCheck: new Date(),
      };
    }

    return {
      name: "Build Status",
      status: buildResult.success ? "pass" : "fail",
      message: buildResult.success
        ? `Build passed (${buildResult.duration}ms)`
        : `Build failed: ${buildResult.errors.slice(0, 2).join(", ")}`,
      lastCheck: new Date(),
    };
  }

  // ============================================================================
  // Trigger System
  // ============================================================================

  private initializeDefaultTriggers(): void {
    // Auto-restart on critical health
    this.addTrigger({
      name: "Auto-restart on critical",
      type: "health",
      condition: { type: "status_equals", pattern: "critical" },
      action: { type: "restart" },
      enabled: true,
      cooldown: 60000, // 1 minute cooldown
    });

    // Recover on high error rate
    this.addTrigger({
      name: "Recover on high errors",
      type: "error_rate",
      condition: { type: "threshold_exceeded", threshold: 15 },
      action: { type: "recover", params: { trigger: "runtime_error" } },
      enabled: true,
      cooldown: 30000,
    });

    // Restart on inactivity
    this.addTrigger({
      name: "Restart on inactivity",
      type: "inactivity",
      condition: { type: "duration_exceeded", duration: 120000 }, // 2 minutes
      action: { type: "restart" },
      enabled: true,
      cooldown: 120000,
    });

    // Recover on consecutive build failures
    this.addTrigger({
      name: "Recover on build failures",
      type: "build_failure",
      condition: { type: "consecutive_failures", threshold: 3 },
      action: { type: "recover", params: { trigger: "build_failure" } },
      enabled: true,
      cooldown: 45000,
    });

    // Pause on too many failures
    this.addTrigger({
      name: "Pause on excessive failures",
      type: "health",
      condition: { type: "consecutive_failures", threshold: 10 },
      action: { type: "pause" },
      enabled: true,
      cooldown: 300000, // 5 minutes
    });
  }

  private evaluateTriggers(): void {
    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;

      // Check cooldown
      if (trigger.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - trigger.lastTriggered.getTime();
        if (timeSinceLastTrigger < trigger.cooldown) {
          continue;
        }
      }

      // Evaluate condition
      if (this.evaluateCondition(trigger)) {
        this.executeTriggerAction(trigger);
      }
    }
  }

  private evaluateCondition(trigger: Trigger): boolean {
    const { condition } = trigger;

    switch (condition.type) {
      case "status_equals":
        return this.status.overall === condition.pattern;

      case "threshold_exceeded":
        if (trigger.type === "error_rate") {
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          const recentErrors = this.errorBuffer.filter(
            (e) => e.timestamp.getTime() > fiveMinutesAgo
          ).length;
          return recentErrors > (condition.threshold || 0);
        }
        return false;

      case "duration_exceeded":
        if (trigger.type === "inactivity") {
          const agent = getAgent();
          const state = agent.getState();
          const inactiveTime = Date.now() - state.lastActivity.getTime();
          return inactiveTime > (condition.duration || 0);
        }
        return false;

      case "consecutive_failures":
        return this.status.consecutiveFailures > (condition.threshold || 0);

      default:
        return false;
    }
  }

  private async executeTriggerAction(trigger: Trigger): Promise<void> {
    trigger.lastTriggered = new Date();
    trigger.triggerCount++;

    logger.warn("Trigger activated", {
      triggerId: trigger.id,
      name: trigger.name,
      action: trigger.action.type,
    });

    const agent = getAgent();

    try {
      switch (trigger.action.type) {
        case "restart":
          logger.info("Trigger action: Restarting agent");
          agent.stop();
          // Small delay before restart
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const state = agent.getState();
          if (state.currentPlan) {
            await agent.resume();
          }
          break;

        case "recover":
          const recoveryTrigger = (trigger.action.params?.trigger as RecoveryTrigger) || "health_check";
          logger.info("Trigger action: Recovery", { recoveryTrigger });
          await agent.triggerRecovery(`Auto-triggered by ${trigger.name}`);
          break;

        case "pause":
          logger.info("Trigger action: Pausing agent");
          agent.pause();
          break;

        case "notify":
          // Would send notification (webhook, email, etc.)
          logger.info("Trigger action: Notification sent");
          break;

        case "escalate":
          logger.warn("Trigger action: Escalation required", {
            trigger: trigger.name,
            status: this.status,
          });
          break;
      }
    } catch (error) {
      logger.error("Trigger action failed", error, { triggerId: trigger.id });
    }
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  private handleAgentEvent(event: AgentEvent): void {
    // Track errors in buffer
    if (
      event.type === "TASK_FAILED" ||
      event.type === "PLAN_FAILED" ||
      (event.type === "BUILD_COMPLETED" && !event.result.success) ||
      (event.type === "TEST_COMPLETED" && !event.result.success)
    ) {
      this.errorBuffer.push({
        timestamp: new Date(),
        type: event.type,
      });

      // Keep buffer at reasonable size
      if (this.errorBuffer.length > 100) {
        this.errorBuffer = this.errorBuffer.slice(-100);
      }
    }

    // Track health check events
    if (event.type === "HEALTH_CHECK") {
      if (!event.healthy) {
        this.status.consecutiveFailures++;
      } else {
        this.status.consecutiveFailures = 0;
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let monitorInstance: HealthMonitor | null = null;

export function getHealthMonitor(): HealthMonitor {
  if (!monitorInstance) {
    monitorInstance = new HealthMonitor();
  }
  return monitorInstance;
}

export function startHealthMonitor(interval?: number): void {
  getHealthMonitor().start(interval);
}

export function stopHealthMonitor(): void {
  if (monitorInstance) {
    monitorInstance.stop();
  }
}
