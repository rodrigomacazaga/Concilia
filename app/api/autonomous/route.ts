// ============================================================================
// Autonomous Agent API
// ============================================================================

import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";
import {
  getAgent,
  resetAgent,
  createPlan,
  getPlan,
  getProjectPlans,
  generatePlanFromDescription,
  generatePlanReport,
  compareArchitecture,
  getHealthMonitor,
  startHealthMonitor,
} from "@/lib/autonomous";
import type { ArchitectureSpec, DevelopmentPlan } from "@/lib/autonomous";

// ============================================================================
// GET - Get agent state and plans
// ============================================================================

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "state";
  const planId = url.searchParams.get("planId");
  const projectId = url.searchParams.get("projectId");

  try {
    switch (action) {
      case "state": {
        const agent = getAgent();
        const state = agent.getState();
        return NextResponse.json({
          success: true,
          data: {
            status: state.status,
            isHealthy: state.isHealthy,
            lastHealthCheck: state.lastHealthCheck,
            consecutiveFailures: state.consecutiveFailures,
            lastActivity: state.lastActivity,
            currentPlan: state.currentPlan
              ? {
                  id: state.currentPlan.id,
                  title: state.currentPlan.title,
                  status: state.currentPlan.status,
                  progress: state.currentPlan.progress,
                  currentIteration: state.currentPlan.currentIteration,
                }
              : null,
            currentTask: state.currentTask
              ? {
                  id: state.currentTask.id,
                  title: state.currentTask.title,
                  status: state.currentTask.status,
                  attempts: state.currentTask.attempts,
                }
              : null,
            recentActivity: state.activityLog.slice(-50),
          },
        });
      }

      case "plan": {
        if (!planId) {
          return NextResponse.json(
            { success: false, error: "planId required" },
            { status: 400 }
          );
        }
        const plan = getPlan(planId);
        if (!plan) {
          return NextResponse.json(
            { success: false, error: "Plan not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: plan });
      }

      case "plans": {
        if (!projectId) {
          return NextResponse.json(
            { success: false, error: "projectId required" },
            { status: 400 }
          );
        }
        const plans = getProjectPlans(projectId);
        return NextResponse.json({ success: true, data: plans });
      }

      case "report": {
        if (!planId) {
          return NextResponse.json(
            { success: false, error: "planId required" },
            { status: 400 }
          );
        }
        const report = await generatePlanReport(planId);
        if (!report) {
          return NextResponse.json(
            { success: false, error: "Plan not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: report });
      }

      case "architecture": {
        if (!planId) {
          return NextResponse.json(
            { success: false, error: "planId required" },
            { status: 400 }
          );
        }
        const diff = await compareArchitecture(planId);
        if (!diff) {
          return NextResponse.json(
            { success: false, error: "Plan not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: diff });
      }

      case "health": {
        const monitor = getHealthMonitor();
        const status = monitor.getStatus();
        const triggers = monitor.getTriggers();
        return NextResponse.json({
          success: true,
          data: { status, triggers },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("Autonomous API GET error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create plans, start/stop agent
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "createPlan": {
        const { projectId, title, description, architecture } = body;

        if (!projectId || !title || !description) {
          return NextResponse.json(
            { success: false, error: "projectId, title, and description required" },
            { status: 400 }
          );
        }

        const plan = createPlan(
          projectId,
          title,
          description,
          architecture || { components: [], apis: [], files: [], dependencies: [] }
        );

        logger.info("Plan created via API", { planId: plan.id });
        return NextResponse.json({ success: true, data: plan });
      }

      case "generatePlan": {
        const { projectId, description, requirements } = body;

        if (!projectId || !description) {
          return NextResponse.json(
            { success: false, error: "projectId and description required" },
            { status: 400 }
          );
        }

        const plan = generatePlanFromDescription({
          projectId,
          description,
          requirements: requirements || [],
        });

        logger.info("Plan generated via API", { planId: plan.id });
        return NextResponse.json({ success: true, data: plan });
      }

      case "start": {
        const { planId } = body;

        if (!planId) {
          return NextResponse.json(
            { success: false, error: "planId required" },
            { status: 400 }
          );
        }

        const plan = getPlan(planId);
        if (!plan) {
          return NextResponse.json(
            { success: false, error: "Plan not found" },
            { status: 404 }
          );
        }

        const agent = getAgent();

        // Start health monitor
        startHealthMonitor();

        // Start the plan execution
        agent.startPlan(plan).catch((error) => {
          logger.error("Plan execution error", error);
        });

        return NextResponse.json({
          success: true,
          message: "Agent started",
          data: { planId: plan.id },
        });
      }

      case "pause": {
        const agent = getAgent();
        agent.pause();
        return NextResponse.json({ success: true, message: "Agent paused" });
      }

      case "resume": {
        const agent = getAgent();
        agent.resume().catch((error) => {
          logger.error("Resume error", error);
        });
        return NextResponse.json({ success: true, message: "Agent resumed" });
      }

      case "stop": {
        const agent = getAgent();
        agent.stop();
        return NextResponse.json({ success: true, message: "Agent stopped" });
      }

      case "reset": {
        resetAgent();
        return NextResponse.json({ success: true, message: "Agent reset" });
      }

      case "recover": {
        const { reason } = body;
        const agent = getAgent();
        await agent.triggerRecovery(reason || "Manual trigger");
        return NextResponse.json({ success: true, message: "Recovery triggered" });
      }

      case "addTrigger": {
        const { name, type, condition, triggerAction, cooldown } = body;

        if (!name || !type || !condition || !triggerAction) {
          return NextResponse.json(
            { success: false, error: "name, type, condition, and action required" },
            { status: 400 }
          );
        }

        const monitor = getHealthMonitor();
        const trigger = monitor.addTrigger({
          name,
          type,
          condition,
          action: triggerAction,
          enabled: true,
          cooldown: cooldown || 60000,
        });

        return NextResponse.json({ success: true, data: trigger });
      }

      case "toggleTrigger": {
        const { triggerId, enabled } = body;

        if (!triggerId || enabled === undefined) {
          return NextResponse.json(
            { success: false, error: "triggerId and enabled required" },
            { status: 400 }
          );
        }

        const monitor = getHealthMonitor();
        if (enabled) {
          monitor.enableTrigger(triggerId);
        } else {
          monitor.disableTrigger(triggerId);
        }

        return NextResponse.json({ success: true, message: "Trigger updated" });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("Autonomous API POST error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
