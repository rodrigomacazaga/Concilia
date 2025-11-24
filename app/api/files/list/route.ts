/**
 * API Endpoint: List Files
 * POST /api/files/list
 *
 * Lista archivos y directorios en una ruta del proyecto
 * Ignora node_modules, .git, .next y otros directorios no relevantes
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  FileListRequest,
  FileListResponse,
  FileEntry,
} from "@/lib/file-operations-types";
import {
  validatePath,
  getPathType,
  getRelativePath,
} from "@/lib/file-security";

// Directorios y archivos a ignorar
const IGNORED_ENTRIES = [
  "node_modules",
  ".git",
  ".next",
  ".backups",
  "dist",
  "build",
  ".DS_Store",
  "Thumbs.db",
];

export async function POST(request: NextRequest) {
  try {
    // Parsear el body
    const body: FileListRequest = await request.json();
    let { path: userPath } = body;

    // Si la ruta es "." o vacía, usar la raíz
    if (!userPath || userPath === ".") {
      userPath = ".";
    }

    console.log(`[files/list] Solicitud de listado: ${userPath}`);

    // Validar que se proporcionó una ruta
    if (typeof userPath !== "string") {
      const errorResponse: FileListResponse = {
        success: false,
        entries: [],
        error: "Se requiere una ruta válida",
        path: userPath || "",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validar y resolver la ruta de forma segura
    let absolutePath: string;
    try {
      absolutePath = validatePath(userPath);
    } catch (error: any) {
      console.error(`[files/list] Error de validación: ${error.message}`);
      const errorResponse: FileListResponse = {
        success: false,
        entries: [],
        error: error.message,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Verificar que la ruta es un directorio
    const pathType = await getPathType(absolutePath);

    if (pathType === null) {
      console.log(`[files/list] Ruta no encontrada: ${userPath}`);
      const notFoundResponse: FileListResponse = {
        success: false,
        entries: [],
        error: "La ruta no existe",
        path: userPath,
      };
      return NextResponse.json(notFoundResponse, { status: 404 });
    }

    if (pathType !== "directory") {
      console.log(`[files/list] La ruta no es un directorio: ${userPath}`);
      const errorResponse: FileListResponse = {
        success: false,
        entries: [],
        error: "La ruta especificada no es un directorio",
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Leer el contenido del directorio
    try {
      const dirEntries = await fs.readdir(absolutePath, { withFileTypes: true });

      // Filtrar y mapear las entradas
      const entries: FileEntry[] = [];

      for (const entry of dirEntries) {
        // Ignorar entradas en la lista de ignorados
        if (IGNORED_ENTRIES.includes(entry.name)) {
          continue;
        }

        // Ignorar archivos ocultos (que empiezan con .)
        if (entry.name.startsWith(".")) {
          continue;
        }

        const entryPath = path.join(absolutePath, entry.name);
        const relativeEntryPath = getRelativePath(entryPath);

        const fileEntry: FileEntry = {
          name: entry.name,
          path: relativeEntryPath,
          type: entry.isDirectory() ? "directory" : "file",
        };

        // Si es un archivo, agregar tamaño y extensión
        if (entry.isFile()) {
          try {
            const stats = await fs.stat(entryPath);
            fileEntry.size = stats.size;
            fileEntry.extension = path.extname(entry.name).slice(1); // Quitar el punto
          } catch (error) {
            // Si falla obtener stats, continuar sin esa info
            console.warn(`[files/list] No se pudo obtener stats de: ${entry.name}`);
          }
        }

        entries.push(fileEntry);
      }

      // Ordenar: directorios primero, luego archivos, ambos alfabéticamente
      entries.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      const relativePath = getRelativePath(absolutePath);

      console.log(
        `[files/list] Listado exitoso: ${relativePath} (${entries.length} entradas)`
      );

      const successResponse: FileListResponse = {
        success: true,
        entries,
        path: relativePath === "" ? "." : relativePath,
      };

      return NextResponse.json(successResponse, { status: 200 });
    } catch (error: any) {
      console.error(`[files/list] Error al leer directorio:`, error);
      const errorResponse: FileListResponse = {
        success: false,
        entries: [],
        error: `Error al leer el directorio: ${error.message}`,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  } catch (error: any) {
    console.error(`[files/list] Error general:`, error);
    const errorResponse: FileListResponse = {
      success: false,
      entries: [],
      error: `Error interno del servidor: ${error.message}`,
      path: "",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
