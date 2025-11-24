/**
 * API Endpoint: Write File
 * POST /api/files/write
 *
 * Escribe contenido en un archivo del proyecto de forma segura
 * Crea un backup automático antes de sobrescribir
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { FileWriteRequest, FileWriteResponse } from "@/lib/file-operations-types";
import {
  validatePath,
  createBackup,
  fileExists,
  getRelativePath,
} from "@/lib/file-security";

export async function POST(request: NextRequest) {
  try {
    // Parsear el body
    const body: FileWriteRequest = await request.json();
    const { path: userPath, content } = body;

    console.log(`[files/write] Solicitud de escritura: ${userPath}`);

    // Validar que se proporcionaron los datos necesarios
    if (!userPath || typeof userPath !== "string") {
      const errorResponse: FileWriteResponse = {
        success: false,
        message: "Se requiere una ruta de archivo válida",
        error: "Ruta inválida",
        path: userPath || "",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (content === undefined || content === null) {
      const errorResponse: FileWriteResponse = {
        success: false,
        message: "Se requiere contenido para escribir",
        error: "Contenido inválido",
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validar y resolver la ruta de forma segura
    let absolutePath: string;
    try {
      absolutePath = validatePath(userPath);
    } catch (error: any) {
      console.error(`[files/write] Error de validación: ${error.message}`);
      const errorResponse: FileWriteResponse = {
        success: false,
        message: "Acceso denegado",
        error: error.message,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    const relativePath = getRelativePath(absolutePath);

    // Si el archivo existe, crear un backup primero
    let backupPath: string | undefined;
    const exists = await fileExists(absolutePath);

    if (exists) {
      try {
        const backupAbsolutePath = await createBackup(absolutePath);
        backupPath = backupAbsolutePath
          ? getRelativePath(backupAbsolutePath)
          : undefined;
        console.log(`[files/write] Backup creado: ${backupPath}`);
      } catch (error: any) {
        console.error(`[files/write] Error al crear backup:`, error);
        // Continuar de todas formas - el backup es una medida de seguridad pero no bloqueante
      }
    }

    // Asegurar que el directorio padre existe
    const directory = path.dirname(absolutePath);
    try {
      await fs.mkdir(directory, { recursive: true });
    } catch (error: any) {
      console.error(`[files/write] Error al crear directorio:`, error);
      const errorResponse: FileWriteResponse = {
        success: false,
        message: "No se pudo crear el directorio",
        error: error.message,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // Escribir el archivo
    try {
      await fs.writeFile(absolutePath, content, "utf-8");

      console.log(
        `[files/write] Archivo escrito exitosamente: ${relativePath} (${content.length} caracteres)`
      );

      const successResponse: FileWriteResponse = {
        success: true,
        message: exists
          ? `Archivo actualizado exitosamente`
          : `Archivo creado exitosamente`,
        backupPath,
        path: relativePath,
      };

      return NextResponse.json(successResponse, { status: 200 });
    } catch (error: any) {
      console.error(`[files/write] Error al escribir archivo:`, error);
      const errorResponse: FileWriteResponse = {
        success: false,
        message: "Error al escribir el archivo",
        error: error.message,
        path: userPath,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  } catch (error: any) {
    console.error(`[files/write] Error general:`, error);
    const errorResponse: FileWriteResponse = {
      success: false,
      message: "Error interno del servidor",
      error: error.message,
      path: "",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
