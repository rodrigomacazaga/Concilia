import { NextRequest, NextResponse } from "next/server";
import {
  getMCPServer,
  updateMCPServer,
  deleteMCPServer,
  startMCPServer,
  stopMCPServer,
} from "@/lib/mcp";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/mcp/[id] - Obtener servidor MCP
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const server = await getMCPServer(id);

    if (!server) {
      return NextResponse.json(
        { error: "Server not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, server });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/mcp/[id] - Actualizar servidor MCP
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await req.json();
    const server = await updateMCPServer(id, body);

    if (!server) {
      return NextResponse.json(
        { error: "Server not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, server });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/mcp/[id] - Eliminar servidor MCP
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const deleted = await deleteMCPServer(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Server not found" },
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

// POST /api/mcp/[id] - Controlar servidor (start/stop)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { action } = body;

    if (!action || !["start", "stop"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'start' or 'stop'" },
        { status: 400 }
      );
    }

    let status;
    if (action === "start") {
      status = await startMCPServer(id);
    } else {
      status = await stopMCPServer(id);
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
