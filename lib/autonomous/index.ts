// ============================================================================
// Autonomous Agent System - Main Export
// ============================================================================

// Types
export * from "./types";

// Agent Core
export { AutonomousAgent, getAgent, resetAgent } from "./agent-core";

// Plan Manager
export {
  createPlan,
  getPlan,
  getProjectPlans,
  updatePlan,
  deletePlan,
  addTask,
  addTasksFromArchitecture,
  compareArchitecture,
  generatePlanFromDescription,
  generatePlanReport,
  exportPlans,
  importPlans,
} from "./plan-manager";
export type { ArchitectureDiff, PlanGenerationRequest, PlanReport } from "./plan-manager";

// Health Monitor
export {
  getHealthMonitor,
  startHealthMonitor,
  stopHealthMonitor,
} from "./health-monitor";
export type { HealthStatus, HealthCheck, Trigger, TriggerType } from "./health-monitor";
