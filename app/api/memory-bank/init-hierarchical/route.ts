// POST /api/memory-bank/init-hierarchical
// Inicializa Memory Bank jerárquico para un proyecto o servicio
// Opcionalmente también crea archivos Docker

import { NextRequest, NextResponse } from "next/server";
import { getProject, ensureProjectPath } from "@/lib/projects";
import {
  initGeneralMemoryBank,
  initLocalMemoryBank,
} from "@/lib/hierarchical-memory-bank";
import { createServiceWithDocker, Technology } from "@/lib/docker/docker-manager";
import type { MemoryBankConfig } from "@/lib/types/memory-bank";

interface InitRequest {
  projectId: string;
  service?: string;
  config?: Partial<MemoryBankConfig> & {
    createDocker?: boolean;
    autoStart?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: InitRequest = await request.json();
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
      const mbResult = await initLocalMemoryBank(
        project.path,
        service,
        config as Partial<MemoryBankConfig>
      );

      // Opcionalmente crear Docker (por defecto true si se especifica tecnología)
      const shouldCreateDocker = config?.createDocker !== false && config?.technology;
      let dockerResult = null;

      if (shouldCreateDocker) {
        const technology = (config?.technology || "node") as Technology;
        const port = config?.port || 5000 + Math.floor(Math.random() * 1000);

        dockerResult = await createServiceWithDocker({
          projectPath: project.path,
          projectName: project.name,
          serviceName: service,
          port,
          technology,
          description: config?.description,
          autoStart: config?.autoStart || false,
        });
      }

      return NextResponse.json({
        ...mbResult,
        type: "local",
        service,
        dockerCreated: !!dockerResult?.success,
        dockerFiles: dockerResult?.files || [],
        dockerErrors: dockerResult?.errors || [],
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
