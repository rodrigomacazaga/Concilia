// ============================================================================
// Development Progress API
// ============================================================================

import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";
import {
  getProgress,
  initializeProgress,
  updateProgress,
  addFeature,
  updateFeature,
  addComponent,
  addApi,
  addError,
  resolveError,
  updateTestResults,
  calculateETA,
} from "@/lib/validation/validator";

// ============================================================================
// GET - Get development progress
// ============================================================================

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: "sessionId required" },
      { status: 400 }
    );
  }

  try {
    let progress = getProgress(sessionId);

    // Initialize if doesn't exist
    if (!progress) {
      progress = initializeProgress("default", sessionId);
    }

    // Calculate ETA
    const eta = calculateETA(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        ...progress,
        startedAt: progress.startedAt.toISOString(),
        lastUpdated: progress.lastUpdated.toISOString(),
        eta: eta
          ? {
              estimatedCompletion: eta.estimatedCompletion.toISOString(),
              confidence: eta.confidence,
              basedOn: eta.basedOn,
            }
          : undefined,
      },
    });
  } catch (error) {
    logger.error("Progress API GET error", error);
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
// POST - Update development progress
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionId, ...data } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId required" },
        { status: 400 }
      );
    }

    // Ensure progress exists
    let progress = getProgress(sessionId);
    if (!progress) {
      progress = initializeProgress(data.projectId || "default", sessionId);
    }

    switch (action) {
      case "initialize": {
        const newProgress = initializeProgress(
          data.projectId || "default",
          sessionId
        );
        return NextResponse.json({ success: true, data: newProgress });
      }

      case "updateStatus": {
        const updated = updateProgress(sessionId, {
          status: data.status,
        });
        return NextResponse.json({ success: true, data: updated });
      }

      case "addFeature": {
        const feature = addFeature(sessionId, {
          name: data.name,
          description: data.description,
          status: data.status || "pending",
          progress: data.progress || 0,
          dependencies: data.dependencies || [],
        });
        return NextResponse.json({ success: true, data: feature });
      }

      case "updateFeature": {
        const feature = updateFeature(sessionId, data.featureId, {
          status: data.status,
          progress: data.progress,
          blockedBy: data.blockedBy,
          startedAt: data.status === "in_progress" ? new Date() : undefined,
          completedAt: data.status === "completed" ? new Date() : undefined,
        });
        return NextResponse.json({ success: true, data: feature });
      }

      case "addComponent": {
        addComponent(sessionId, {
          name: data.name,
          path: data.path,
          status: data.status || "created",
          hasTests: data.hasTests || false,
          errors: data.errors || 0,
        });
        return NextResponse.json({ success: true });
      }

      case "addApi": {
        addApi(sessionId, {
          route: data.route,
          methods: data.methods || ["GET"],
          status: data.status || "implemented",
          hasTests: data.hasTests || false,
        });
        return NextResponse.json({ success: true });
      }

      case "addError": {
        addError(sessionId, {
          type: data.type || "runtime",
          message: data.message,
          file: data.file,
          line: data.line,
          timestamp: new Date(),
          resolved: false,
        });
        return NextResponse.json({ success: true });
      }

      case "resolveError": {
        resolveError(sessionId, data.errorId, data.resolution);
        return NextResponse.json({ success: true });
      }

      case "updateTests": {
        updateTestResults(sessionId, {
          passed: data.passed || 0,
          failed: data.failed || 0,
          skipped: data.skipped || 0,
          coverage: data.coverage,
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("Progress API POST error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
