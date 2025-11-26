// GET /api/memory-bank/service/[service]?projectId=xxx
// Obtiene el Memory Bank LOCAL de un servicio específico
// POST /api/memory-bank/service/[service]?projectId=xxx
// Actualiza un archivo del Memory Bank local

import { NextRequest, NextResponse } from "next/server";
import { getProject, ensureProjectPath } from "@/lib/projects";
import {
  getLocalMemoryBank,
  updateLocalMemoryBankFile,
  syncLocalToGeneral,
} from "@/lib/hierarchical-memory-bank";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

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

    // Obtener Memory Bank local del servicio
    const localMB = await getLocalMemoryBank(project.path, service);

    return NextResponse.json({
      success: true,
      ...localMB,
    });
  } catch (error) {
    console.error("[Memory Bank Service] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const body = await request.json();

    const { fileName, content, triggerSync = true } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    if (!fileName || content === undefined) {
      return NextResponse.json(
        { error: "fileName and content are required" },
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

    // Actualizar archivo
    const result = await updateLocalMemoryBankFile(
      project.path,
      service,
      fileName,
      content
    );

    // Trigger sync si está habilitado
    let syncResult = null;
    if (triggerSync) {
      syncResult = await syncLocalToGeneral(project.path, service);
    }

    return NextResponse.json({
      ...result,
      syncResult,
    });
  } catch (error) {
    console.error("[Memory Bank Service] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
