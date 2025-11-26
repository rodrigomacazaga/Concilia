// GET /api/docker/[service]?projectId=xxx
// Obtiene estado de un servicio específico
// POST /api/docker/[service]?projectId=xxx&action=start|stop|build|restart|logs
// Ejecuta acción en un servicio

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getProject, ensureProjectPath } from "@/lib/projects";
import {
  startService,
  stopService,
  buildService,
  restartService,
  getServiceLogs,
  getServiceStatus,
} from "@/lib/docker/docker-manager";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    let project = await getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    project = await ensureProjectPath(project);
    const servicePath = path.join(project.path, service);

    const status = await getServiceStatus(servicePath, service);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("[Docker Service API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const action = searchParams.get("action");

    if (!projectId || !action) {
      return NextResponse.json(
        { error: "projectId and action are required" },
        { status: 400 }
      );
    }

    let project = await getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    project = await ensureProjectPath(project);
    const servicePath = path.join(project.path, service);

    let result;

    switch (action) {
      case "start":
        result = await startService(servicePath, service);
        break;

      case "stop":
        result = await stopService(servicePath, service);
        break;

      case "build":
        result = await buildService(servicePath, service);
        break;

      case "restart":
        result = await restartService(servicePath, service);
        break;

      case "logs": {
        const body = await request.json().catch(() => ({}));
        result = await getServiceLogs(servicePath, service, body.lines || 100);
        break;
      }

      case "status":
        result = await getServiceStatus(servicePath, service);
        return NextResponse.json({
          success: true,
          ...result,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Docker Service API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
