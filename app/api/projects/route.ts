import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/projects";

// GET /api/projects - Listar proyectos
export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/projects - Crear proyecto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, path, gitUrl, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const project = await createProject({ name, path, gitUrl, description });
    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
