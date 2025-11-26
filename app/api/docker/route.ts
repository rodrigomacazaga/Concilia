// GET /api/docker?projectId=xxx
// Lista estado de todos los servicios Docker del proyecto

import { NextRequest, NextResponse } from "next/server";
import { getProject, ensureProjectPath } from "@/lib/projects";
import { getAllServicesStatus } from "@/lib/docker/docker-manager";

export async function GET(request: NextRequest) {
  try {
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

    // Asegurar que el proyecto tenga un path válido
    project = await ensureProjectPath(project);

    const services = await getAllServicesStatus(project.path);

    return NextResponse.json({
      success: true,
      services,
      projectPath: project.path,
    });
  } catch (error) {
    console.error("[Docker API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
