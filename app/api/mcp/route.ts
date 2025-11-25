import { NextRequest, NextResponse } from "next/server";
import {
  listMCPServers,
  addMCPServer,
  getAllMCPStatus,
  getAllMCPTools,
} from "@/lib/mcp";

// GET /api/mcp - Listar servidores MCP y estado
export async function GET(req: NextRequest) {
  const includeTools = req.nextUrl.searchParams.get("tools") === "true";

  try {
    const servers = await listMCPServers();
    const status = await getAllMCPStatus();

    const response: any = { success: true, servers, status };

    if (includeTools) {
      response.tools = await getAllMCPTools();
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/mcp - Agregar servidor MCP
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, command, args, env } = body;

    if (!name || !command) {
      return NextResponse.json(
        { error: "name and command are required" },
        { status: 400 }
      );
    }

    const server = await addMCPServer({ name, description, command, args, env });
    return NextResponse.json({ success: true, server });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
