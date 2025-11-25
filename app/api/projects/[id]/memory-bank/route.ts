import { NextRequest, NextResponse } from "next/server";
import { getProject, loadProjectMemoryBank } from "@/lib/projects";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/memory-bank - Cargar Memory Bank del proyecto
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

    if (!project.path) {
      return NextResponse.json(
        { error: "Project has no path configured" },
        { status: 400 }
      );
    }

    const memoryBank = await loadProjectMemoryBank(project.path);

    return NextResponse.json({
      success: true,
      hasMemoryBank: !!memoryBank,
      content: memoryBank,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
