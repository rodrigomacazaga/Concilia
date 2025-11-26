/**
 * API Endpoint: Browse Directories
 * POST /api/files/browse
 *
 * Permite navegar por el sistema de archivos para seleccionar carpetas
 * Diseñado para el selector de carpetas de proyectos
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

interface BrowseRequest {
  path?: string;
  showHidden?: boolean;
}

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface BrowseResponse {
  success: boolean;
  currentPath: string;
  parentPath: string | null;
  entries: DirectoryEntry[];
  quickAccess: { name: string; path: string }[];
  error?: string;
}

// Obtener rutas de acceso rápido según el sistema operativo
function getQuickAccessPaths(): { name: string; path: string }[] {
  const homeDir = os.homedir();
  const platform = os.platform();

  const paths: { name: string; path: string }[] = [
    { name: "Home", path: homeDir },
  ];

  if (platform === "darwin") {
    // macOS
    paths.push(
      { name: "Desktop", path: path.join(homeDir, "Desktop") },
      { name: "Documents", path: path.join(homeDir, "Documents") },
      { name: "Downloads", path: path.join(homeDir, "Downloads") },
      { name: "Projects", path: path.join(homeDir, "Projects") },
      { name: "Developer", path: path.join(homeDir, "Developer") }
    );
  } else if (platform === "win32") {
    // Windows
    paths.push(
      { name: "Desktop", path: path.join(homeDir, "Desktop") },
      { name: "Documents", path: path.join(homeDir, "Documents") },
      { name: "Downloads", path: path.join(homeDir, "Downloads") }
    );
  } else {
    // Linux
    paths.push(
      { name: "Desktop", path: path.join(homeDir, "Desktop") },
      { name: "Documents", path: path.join(homeDir, "Documents") },
      { name: "Downloads", path: path.join(homeDir, "Downloads") },
      { name: "Projects", path: path.join(homeDir, "projects") }
    );
  }

  // Raíz del sistema
  paths.push({ name: "Root", path: platform === "win32" ? "C:\\" : "/" });

  return paths;
}

export async function POST(request: NextRequest) {
  try {
    const body: BrowseRequest = await request.json();
    const { showHidden = false } = body;
    let { path: requestPath } = body;

    // Si no se proporciona ruta, usar el home
    if (!requestPath) {
      requestPath = os.homedir();
    }

    // Resolver la ruta absoluta
    const absolutePath = path.resolve(requestPath);

    console.log(`[files/browse] Navegando a: ${absolutePath}`);

    // Verificar que existe y es un directorio
    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          {
            success: false,
            currentPath: absolutePath,
            parentPath: null,
            entries: [],
            quickAccess: getQuickAccessPaths(),
            error: "La ruta no es un directorio",
          } as BrowseResponse,
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          currentPath: absolutePath,
          parentPath: null,
          entries: [],
          quickAccess: getQuickAccessPaths(),
          error: "La ruta no existe",
        } as BrowseResponse,
        { status: 404 }
      );
    }

    // Leer el directorio
    const dirEntries = await fs.readdir(absolutePath, { withFileTypes: true });

    // Filtrar y mapear entradas
    const entries: DirectoryEntry[] = [];

    for (const entry of dirEntries) {
      // Filtrar archivos ocultos si no se solicitan
      if (!showHidden && entry.name.startsWith(".")) {
        continue;
      }

      // Solo incluir directorios
      if (!entry.isDirectory()) {
        continue;
      }

      // Excluir node_modules y similares para mejor rendimiento
      if (["node_modules", ".git", ".next", "__pycache__"].includes(entry.name)) {
        continue;
      }

      entries.push({
        name: entry.name,
        path: path.join(absolutePath, entry.name),
        isDirectory: true,
      });
    }

    // Ordenar alfabéticamente
    entries.sort((a, b) => a.name.localeCompare(b.name));

    // Calcular ruta padre
    const parentPath = path.dirname(absolutePath);
    const hasParent = parentPath !== absolutePath;

    const response: BrowseResponse = {
      success: true,
      currentPath: absolutePath,
      parentPath: hasParent ? parentPath : null,
      entries,
      quickAccess: getQuickAccessPaths(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[files/browse] Error:", error);
    return NextResponse.json(
      {
        success: false,
        currentPath: "",
        parentPath: null,
        entries: [],
        quickAccess: getQuickAccessPaths(),
        error: error.message,
      } as BrowseResponse,
      { status: 500 }
    );
  }
}
