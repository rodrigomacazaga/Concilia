import { NextRequest, NextResponse } from "next/server";
import {
  getConversation,
  deleteConversation,
  renameConversation,
  addMessage,
} from "@/lib/conversations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id]?projectId=xxx - Obtener conversación
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const projectId = req.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  try {
    const conversation = await getConversation(projectId, id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Actualizar conversación (renombrar)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { projectId, title } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const conversation = await renameConversation(projectId, id, title);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id]?projectId=xxx - Eliminar conversación
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const projectId = req.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteConversation(projectId, id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Conversation not found" },
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

// POST /api/conversations/[id] - Agregar mensaje
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { projectId, role, content } = body;

    if (!projectId || !role || !content) {
      return NextResponse.json(
        { error: "projectId, role, and content are required" },
        { status: 400 }
      );
    }

    const message = await addMessage(projectId, id, { role, content });
    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
