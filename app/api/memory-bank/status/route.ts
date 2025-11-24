import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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

export async function GET(request: NextRequest) {
  try {
    // Verificar que exista el directorio
    try {
      await fs.access(MEMORY_BANK_DIR);
    } catch (error) {
      return NextResponse.json({
        success: true,
        exists: false,
        initialized: false,
        message: "Memory Bank no existe",
      });
    }

    // Verificar cuántos archivos existen
    const existingFiles: string[] = [];
    const missingFiles: string[] = [];

    for (const filename of MEMORY_BANK_FILES) {
      const filePath = path.join(MEMORY_BANK_DIR, filename);

      try {
        await fs.access(filePath);
        existingFiles.push(filename);
      } catch (error) {
        missingFiles.push(filename);
      }
    }

    // Verificar si está inicializado (leer un archivo y ver si tiene contenido real)
    let isInitialized = false;
    let completeness = 0;

    if (existingFiles.length > 0) {
      const firstFile = path.join(MEMORY_BANK_DIR, existingFiles[0]);
      const content = await fs.readFile(firstFile, "utf-8");
      isInitialized = !content.includes("[No inicializado]");

      // Calcular porcentaje de completitud
      let filledFiles = 0;
      for (const filename of existingFiles) {
        const filePath = path.join(MEMORY_BANK_DIR, filename);
        const fileContent = await fs.readFile(filePath, "utf-8");

        // Verificar si tiene contenido real (no solo plantillas)
        const hasPendingContent = fileContent.includes("[Pendiente");
        const hasNoInitContent = fileContent.includes("[No inicializado]");

        if (!hasPendingContent && !hasNoInitContent) {
          filledFiles++;
        }
      }

      completeness = Math.round((filledFiles / MEMORY_BANK_FILES.length) * 100);
    }

    return NextResponse.json({
      success: true,
      exists: true,
      initialized: isInitialized,
      completeness,
      totalFiles: MEMORY_BANK_FILES.length,
      existingFiles: existingFiles.length,
      missingFiles: missingFiles.length,
      files: {
        existing: existingFiles,
        missing: missingFiles,
      },
    });
  } catch (error) {
    console.error("[Memory Bank Status] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
