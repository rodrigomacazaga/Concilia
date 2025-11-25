import { NextRequest, NextResponse } from "next/server";
import { getProject, runGitCommand, getGitStatus } from "@/lib/projects";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/git/[projectId] - Obtener estado de git
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;

  try {
    const project = await getProject(projectId);

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

    const status = await getGitStatus(project.path);

    if (!status) {
      return NextResponse.json(
        { error: "Not a git repository" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/git/[projectId] - Ejecutar comando git
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;

  try {
    const body = await req.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json(
        { error: "command is required" },
        { status: 400 }
      );
    }

    const project = await getProject(projectId);

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

    const result = await runGitCommand(project.path, command);

    return NextResponse.json({
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
