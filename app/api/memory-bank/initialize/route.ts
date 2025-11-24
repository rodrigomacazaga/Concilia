import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PROJECT_ROOT = process.cwd();
const MEMORY_BANK_DIR = path.join(PROJECT_ROOT, "memory-bank");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectName, problem, targetUser, stack, decisions } = body;

    console.log("[Memory Bank] Inicializando con datos del usuario...");

    // Crear directorio si no existe
    try {
      await fs.access(MEMORY_BANK_DIR);
    } catch (error) {
      await fs.mkdir(MEMORY_BANK_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString();

    // Actualizar projectBrief.md
    if (projectName || problem || targetUser) {
      const projectBriefPath = path.join(MEMORY_BANK_DIR, "projectBrief.md");
      let projectBrief = await fs.readFile(projectBriefPath, "utf-8");

      if (projectName) {
        projectBrief = projectBrief.replace(
          /## Nombre del Proyecto\n\[Pendiente de definir\]/,
          `## Nombre del Proyecto\n${projectName}`
        );
      }

      if (problem) {
        projectBrief = projectBrief.replace(
          /## Problema que Resuelve\n\[Pendiente de definir\]/,
          `## Problema que Resuelve\n${problem}`
        );
      }

      if (targetUser) {
        projectBrief = projectBrief.replace(
          /## Usuario Objetivo\n\[Pendiente de definir\]/,
          `## Usuario Objetivo\n${targetUser}`
        );
      }

      projectBrief = projectBrief.replace(
        /\*Última actualización:.*\*/,
        `*Última actualización: ${timestamp}*`
      );

      await fs.writeFile(projectBriefPath, projectBrief, "utf-8");
    }

    // Actualizar techContext.md
    if (stack) {
      const techContextPath = path.join(MEMORY_BANK_DIR, "techContext.md");
      let techContext = await fs.readFile(techContextPath, "utf-8");

      // Agregar stack tecnológico
      if (stack.frontend) {
        techContext = techContext.replace(
          /### Frontend\n- Framework: \[Pendiente\]/,
          `### Frontend\n- Framework: ${stack.frontend}`
        );
      }

      if (stack.backend) {
        techContext = techContext.replace(
          /### Backend\n- Runtime: \[Pendiente\]/,
          `### Backend\n- Runtime: ${stack.backend}`
        );
      }

      if (stack.database) {
        techContext = techContext.replace(
          /- Database: \[Pendiente\]/,
          `- Database: ${stack.database}`
        );
      }

      if (stack.styling) {
        techContext = techContext.replace(
          /- Styling: \[Pendiente\]/,
          `- Styling: ${stack.styling}`
        );
      }

      techContext = techContext.replace(
        /\*Última actualización:.*\*/,
        `*Última actualización: ${timestamp}*`
      );

      await fs.writeFile(techContextPath, techContext, "utf-8");
    }

    // Actualizar decisionLog.md
    if (decisions && decisions.length > 0) {
      const decisionLogPath = path.join(MEMORY_BANK_DIR, "decisionLog.md");
      let decisionLog = await fs.readFile(decisionLogPath, "utf-8");

      const decisionEntries = decisions
        .map(
          (decision: { title: string; context: string; rationale: string }) => `
## [${timestamp.split("T")[0]}] - ${decision.title}

### Contexto
${decision.context}

### Decisión Tomada
${decision.rationale}

### Consecuencias
[Por documentar]

### Impacto
[Por documentar]
`
        )
        .join("\n---\n");

      decisionLog = decisionLog.replace(
        /\*\[Pendiente - No hay decisiones registradas aún\]\*/,
        decisionEntries
      );

      decisionLog = decisionLog.replace(
        /\*Última actualización:.*\*/,
        `*Última actualización: ${timestamp}*`
      );

      await fs.writeFile(decisionLogPath, decisionLog, "utf-8");
    }

    // Actualizar activeContext.md
    const activeContextPath = path.join(MEMORY_BANK_DIR, "activeContext.md");
    let activeContext = await fs.readFile(activeContextPath, "utf-8");

    activeContext = activeContext.replace(
      /### Tarea Activa\n\*\*\[Nombre de la tarea\]\*\*/,
      `### Tarea Activa\n**Inicialización del Proyecto**`
    );

    activeContext = activeContext.replace(
      /- Estado: \[En progreso \/ Pendiente\]/,
      `- Estado: En progreso`
    );

    activeContext = activeContext.replace(
      /- Fecha de inicio: \[Fecha\]/,
      `- Fecha de inicio: ${timestamp.split("T")[0]}`
    );

    activeContext = activeContext.replace(
      /\[Pendiente - Descripción detallada de lo que se está trabajando\]/,
      `Proyecto inicializado con Memory Bank. Configuración básica completada.`
    );

    activeContext = activeContext.replace(
      /\*Última actualización:.*\*/,
      `*Última actualización: ${timestamp}*`
    );

    await fs.writeFile(activeContextPath, activeContext, "utf-8");

    console.log("[Memory Bank] Inicialización completada");

    return NextResponse.json({
      success: true,
      message: "Memory Bank inicializado exitosamente",
      timestamp,
      filesUpdated: [
        "projectBrief.md",
        "techContext.md",
        "decisionLog.md",
        "activeContext.md",
      ],
    });
  } catch (error) {
    console.error("[Memory Bank Initialize] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
