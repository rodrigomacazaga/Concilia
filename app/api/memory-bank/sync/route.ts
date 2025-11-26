// POST /api/memory-bank/sync
// Sincroniza Memory Banks locales con el general

import { NextRequest, NextResponse } from "next/server";
import { getProject, ensureProjectPath } from "@/lib/projects";
import {
  syncLocalToGeneral,
  syncAllServices,
} from "@/lib/hierarchical-memory-bank";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, service } = body;

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

    if (service) {
      // Sincronizar un servicio específico
      const result = await syncLocalToGeneral(project.path, service);
      return NextResponse.json({
        success: result.success,
        result,
      });
    } else {
      // Sincronizar todos los servicios
      const results = await syncAllServices(project.path);
      return NextResponse.json({
        success: results.every((r) => r.success),
        results,
      });
    }
  } catch (error) {
    console.error("[Memory Bank Sync] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
