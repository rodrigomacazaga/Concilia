import { NextRequest, NextResponse } from "next/server";
import {
  listConversations,
  createConversation,
} from "@/lib/conversations";

// GET /api/conversations?projectId=xxx - Listar conversaciones
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  try {
    const conversations = await listConversations(projectId);
    return NextResponse.json({ success: true, conversations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Crear conversación
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, title } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const conversation = await createConversation(projectId, title);
    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
