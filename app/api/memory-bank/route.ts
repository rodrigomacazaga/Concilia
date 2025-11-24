import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const PROJECT_ROOT = process.cwd();
const MEMORY_BANK_DIR = path.join(PROJECT_ROOT, "memory-bank");

const MEMORY_BANK_FILES = [
  "projectBrief.md",
  "productContext.md",
  "techContext.md",
  "systemPatterns.md",
  "activeContext.md",
  "progress.md",
  "decisionLog.md",
  "knownIssues.md",
];

// ============================================================================
// GET - Leer todo el Memory Bank
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    console.log("[Memory Bank] Leyendo todos los archivos...");

    // Verificar que exista el directorio
    try {
      await fs.access(MEMORY_BANK_DIR);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Memory Bank no inicializado",
          initialized: false,
        },
        { status: 404 }
      );
    }

    // Leer todos los archivos
    const files: Record<string, string> = {};
    let allContent = "";

    for (const filename of MEMORY_BANK_FILES) {
      const filePath = path.join(MEMORY_BANK_DIR, filename);

      try {
        const content = await fs.readFile(filePath, "utf-8");
        files[filename] = content;

        // Agregar al contenido consolidado
        allContent += `\n\n${"=".repeat(80)}\n`;
        allContent += `FILE: ${filename}\n`;
        allContent += `${"=".repeat(80)}\n\n`;
        allContent += content;
      } catch (error) {
        console.warn(`[Memory Bank] Archivo no encontrado: ${filename}`);
        files[filename] = "";
      }
    }

    // Verificar si está inicializado (si tiene contenido real, no solo plantillas)
    const isInitialized = !allContent.includes("[No inicializado]");

    console.log(`[Memory Bank] Leídos ${Object.keys(files).length} archivos`);
    console.log(`[Memory Bank] Estado: ${isInitialized ? "Inicializado" : "No inicializado"}`);

    return NextResponse.json({
      success: true,
      initialized: isInitialized,
      files,
      consolidated: allContent,
      totalFiles: Object.keys(files).length,
    });
  } catch (error) {
    console.error("[Memory Bank] Error leyendo archivos:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Actualizar un archivo específico
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, content, append, section } = body;

    console.log(`[Memory Bank] Actualizando archivo: ${file}`);

    // Validar input
    if (!file || typeof file !== "string") {
      return NextResponse.json(
        { success: false, error: "El campo 'file' es requerido" },
        { status: 400 }
      );
    }

    if (content === undefined && !append) {
      return NextResponse.json(
        { success: false, error: "El campo 'content' es requerido" },
        { status: 400 }
      );
    }

    // Validar que el archivo esté en la lista permitida
    if (!MEMORY_BANK_FILES.includes(file)) {
      return NextResponse.json(
        { success: false, error: `Archivo '${file}' no está en el Memory Bank` },
        { status: 400 }
      );
    }

    const filePath = path.join(MEMORY_BANK_DIR, file);

    // Verificar que exista el directorio
    try {
      await fs.access(MEMORY_BANK_DIR);
    } catch (error) {
      // Crear directorio si no existe
      await fs.mkdir(MEMORY_BANK_DIR, { recursive: true });
    }

    let finalContent = content;

    // Si es modo append (agregar contenido)
    if (append && section) {
      try {
        const existingContent = await fs.readFile(filePath, "utf-8");

        // Buscar la sección y agregar contenido
        const sectionRegex = new RegExp(`(## ${section}[\\s\\S]*?)(?=\\n## |$)`, "i");
        const match = existingContent.match(sectionRegex);

        if (match) {
          const updatedSection = match[0] + "\n" + content;
          finalContent = existingContent.replace(sectionRegex, updatedSection);
        } else {
          // Si no existe la sección, agregarla al final
          finalContent = existingContent + `\n\n## ${section}\n${content}`;
        }
      } catch (error) {
        // Si el archivo no existe, crear con el contenido
        finalContent = `## ${section}\n${content}`;
      }
    }

    // Actualizar timestamp
    const timestamp = new Date().toISOString();
    finalContent = finalContent.replace(
      /\*Última actualización:.*\*/,
      `*Última actualización: ${timestamp}*`
    );

    // Escribir archivo
    await fs.writeFile(filePath, finalContent, "utf-8");

    console.log(`[Memory Bank] Archivo actualizado: ${file}`);

    return NextResponse.json({
      success: true,
      file,
      message: `Archivo ${file} actualizado exitosamente`,
      timestamp,
    });
  } catch (error) {
    console.error("[Memory Bank] Error actualizando archivo:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
