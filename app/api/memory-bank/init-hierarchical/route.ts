// POST /api/memory-bank/init-hierarchical
// Inicializa Memory Bank jerárquico para un proyecto o servicio

import { NextRequest, NextResponse } from "next/server";
import { getProject, ensureProjectPath } from "@/lib/projects";
import {
  initGeneralMemoryBank,
  initLocalMemoryBank,
} from "@/lib/hierarchical-memory-bank";
import type { MemoryBankConfig } from "@/lib/types/memory-bank";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, service, config } = body;

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
      // Inicializar Memory Bank LOCAL para un servicio
      const result = await initLocalMemoryBank(
        project.path,
        service,
        config as Partial<MemoryBankConfig>
      );

      return NextResponse.json({
        ...result,
        type: "local",
        service,
      });
    } else {
      // Inicializar Memory Bank GENERAL
      const result = await initGeneralMemoryBank(project.path, project.name);

      return NextResponse.json({
        ...result,
        type: "general",
      });
    }
  } catch (error) {
    console.error("[Memory Bank Init] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
