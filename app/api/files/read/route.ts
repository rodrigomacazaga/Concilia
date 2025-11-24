/**
 * API Endpoint: Read File
 * POST /api/files/read
 *
 * Lee el contenido de un archivo del proyecto de forma segura
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { FileReadRequest, FileReadResponse } from "@/lib/file-operations-types";
import { validatePath, fileExists, getRelativePath } from "@/lib/file-security";

export async function POST(request: NextRequest) {
  try {
    // Parsear el body
    const body: FileReadRequest = await request.json();
    const { path: userPath } = body;

    console.log(`[files/read] Solicitud de lectura: ${userPath}`);

    // Validar que se proporcionó una ruta
    if (!userPath || typeof userPath !== "string") {
      const errorResponse: FileReadResponse = {
        success: false,
        exists: false,
        error: "Se requiere una ruta de archivo válida",
        path: userPath || "",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validar y resolver la ruta de forma segura
    let absolutePath: string;
    try {
      absolutePath = validatePath(userPath);
    } catch (error: any) {
      console.error(`[files/read] Error de validación: ${error.message}`);
      const errorResponse: FileReadResponse = {
        success: false,
        exists: false,
        error: error.message,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Verificar si el archivo existe
    const exists = await fileExists(absolutePath);

    if (!exists) {
      console.log(`[files/read] Archivo no encontrado: ${userPath}`);
      const notFoundResponse: FileReadResponse = {
        success: false,
        exists: false,
        error: "El archivo no existe",
        path: userPath,
      };
      return NextResponse.json(notFoundResponse, { status: 404 });
    }

    // Leer el contenido del archivo
    try {
      const content = await fs.readFile(absolutePath, "utf-8");
      const relativePath = getRelativePath(absolutePath);

      console.log(
        `[files/read] Archivo leído exitosamente: ${relativePath} (${content.length} caracteres)`
      );

      const successResponse: FileReadResponse = {
        success: true,
        exists: true,
        content,
        path: relativePath,
      };

      return NextResponse.json(successResponse, { status: 200 });
    } catch (error: any) {
      console.error(`[files/read] Error al leer archivo:`, error);
      const errorResponse: FileReadResponse = {
        success: false,
        exists: true,
        error: `Error al leer el archivo: ${error.message}`,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  } catch (error: any) {
    console.error(`[files/read] Error general:`, error);
    const errorResponse: FileReadResponse = {
      success: false,
      exists: false,
      error: `Error interno del servidor: ${error.message}`,
      path: "",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
