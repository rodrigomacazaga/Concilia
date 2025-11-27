/**
 * API Endpoint: Delete File/Directory
 * DELETE /api/files/delete
 *
 * Elimina un archivo o directorio del proyecto de forma segura
 * Crea un backup antes de eliminar
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  validatePath,
  createBackup,
  fileExists,
  getRelativePath,
  getPathType,
} from "@/lib/file-security";

interface FileDeleteResponse {
  success: boolean;
  message: string;
  error?: string;
  path: string;
  backupPath?: string;
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userPath = searchParams.get("path");

    console.log(`[files/delete] Solicitud de eliminación: ${userPath}`);

    // Validar que se proporcionó una ruta
    if (!userPath || typeof userPath !== "string") {
      const errorResponse: FileDeleteResponse = {
        success: false,
        message: "Se requiere una ruta válida",
        error: "Ruta inválida",
        path: userPath || "",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validar y resolver la ruta de forma segura
    let absolutePath: string;
    try {
      absolutePath = validatePath(userPath);
    } catch (error: any) {
      console.error(`[files/delete] Error de validación: ${error.message}`);
      const errorResponse: FileDeleteResponse = {
        success: false,
        message: "Acceso denegado",
        error: error.message,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    const relativePath = getRelativePath(absolutePath);

    // Verificar que el path existe
    const exists = await fileExists(absolutePath);
    if (!exists) {
      const errorResponse: FileDeleteResponse = {
        success: false,
        message: "El archivo o directorio no existe",
        error: "No encontrado",
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Determinar tipo (archivo o directorio)
    const pathType = await getPathType(absolutePath);

    // Crear backup antes de eliminar (solo para archivos)
    let backupPath: string | undefined;
    if (pathType === "file") {
      try {
        const backupAbsolutePath = await createBackup(absolutePath);
        backupPath = backupAbsolutePath
          ? getRelativePath(backupAbsolutePath)
          : undefined;
        console.log(`[files/delete] Backup creado: ${backupPath}`);
      } catch (error: any) {
        console.error(`[files/delete] Error al crear backup:`, error);
        // Continuar de todas formas
      }
    }

    // Eliminar
    try {
      if (pathType === "directory") {
        await fs.rm(absolutePath, { recursive: true });
        console.log(`[files/delete] Directorio eliminado: ${relativePath}`);
      } else {
        await fs.unlink(absolutePath);
        console.log(`[files/delete] Archivo eliminado: ${relativePath}`);
      }

      const successResponse: FileDeleteResponse = {
        success: true,
        message: `${pathType === "directory" ? "Directorio" : "Archivo"} eliminado exitosamente`,
        path: relativePath,
        backupPath,
      };

      return NextResponse.json(successResponse, { status: 200 });
    } catch (error: any) {
      console.error(`[files/delete] Error al eliminar:`, error);
      const errorResponse: FileDeleteResponse = {
        success: false,
        message: "Error al eliminar",
        error: error.message,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  } catch (error: any) {
    console.error(`[files/delete] Error general:`, error);
    const errorResponse: FileDeleteResponse = {
      success: false,
      message: "Error interno del servidor",
      error: error.message,
      path: "",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// También soportar POST para mayor compatibilidad
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: userPath } = body;

    // Redirigir a DELETE
    const url = new URL(request.url);
    url.searchParams.set("path", userPath);

    return DELETE(new NextRequest(url, { method: "DELETE" }));
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Error", error: error.message, path: "" },
      { status: 500 }
    );
  }
}
