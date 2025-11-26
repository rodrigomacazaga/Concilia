// GET /api/memory-bank/hierarchical?projectId=xxx
// Obtiene el Memory Bank GENERAL del proyecto (jerárquico)

import { NextRequest, NextResponse } from "next/server";
import { getProject, ensureProjectPath } from "@/lib/projects";
import { getGeneralMemoryBank } from "@/lib/hierarchical-memory-bank";

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

    // Cargar proyecto
    let project = await getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Asegurar que el proyecto tenga un path válido
    project = await ensureProjectPath(project);

    // Obtener Memory Bank general
    const generalMB = await getGeneralMemoryBank(project.path, project.name);

    return NextResponse.json({
      success: true,
      ...generalMB,
    });
  } catch (error) {
    console.error("[Memory Bank Hierarchical] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
