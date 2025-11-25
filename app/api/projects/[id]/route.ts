import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  updateProject,
  deleteProject,
  getGitStatus,
  loadProjectMemoryBank,
} from "@/lib/projects";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Obtener proyecto
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const project = await getProject(id);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Obtener estado de git si el proyecto tiene path
    let gitStatus = null;
    if (project.path) {
      gitStatus = await getGitStatus(project.path);
    }

    return NextResponse.json({ success: true, project, gitStatus });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Actualizar proyecto
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await req.json();
    const project = await updateProject(id, body);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Eliminar proyecto
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const deleteFiles = req.nextUrl.searchParams.get("deleteFiles") === "true";

  try {
    const deleted = await deleteProject(id, deleteFiles);

    if (!deleted) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
