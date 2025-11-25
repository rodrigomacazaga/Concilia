import fs from "fs/promises";
import path from "path";
import { spawn, ChildProcess } from "child_process";

const DATA_DIR = path.join(process.cwd(), "data");
const MCP_CONFIG_FILE = path.join(DATA_DIR, "mcp-servers.json");

export interface MCPServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  serverId: string;
}

export interface MCPServerStatus {
  id: string;
  name: string;
  running: boolean;
  pid?: number;
  tools?: MCPTool[];
  error?: string;
}

// Procesos MCP activos
const activeProcesses: Map<string, ChildProcess> = new Map();
const serverTools: Map<string, MCPTool[]> = new Map();

// Cargar configuración MCP
async function loadMCPConfig(): Promise<MCPServer[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(MCP_CONFIG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Guardar configuración MCP
async function saveMCPConfig(servers: MCPServer[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(MCP_CONFIG_FILE, JSON.stringify(servers, null, 2));
}

// Listar servidores MCP
export async function listMCPServers(): Promise<MCPServer[]> {
  return loadMCPConfig();
}

// Obtener servidor MCP
export async function getMCPServer(id: string): Promise<MCPServer | null> {
  const servers = await loadMCPConfig();
  return servers.find((s) => s.id === id) || null;
}

// Agregar servidor MCP
export async function addMCPServer(data: {
  name: string;
  description?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}): Promise<MCPServer> {
  const servers = await loadMCPConfig();

  const id = `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const server: MCPServer = {
    id,
    name: data.name,
    description: data.description,
    command: data.command,
    args: data.args,
    env: data.env,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  servers.push(server);
  await saveMCPConfig(servers);

  return server;
}

// Actualizar servidor MCP
export async function updateMCPServer(id: string, data: Partial<MCPServer>): Promise<MCPServer | null> {
  const servers = await loadMCPConfig();
  const index = servers.findIndex((s) => s.id === id);

  if (index === -1) {
    return null;
  }

  servers[index] = {
    ...servers[index],
    ...data,
    id, // No permitir cambiar el ID
    updatedAt: new Date().toISOString(),
  };

  await saveMCPConfig(servers);
  return servers[index];
}

// Eliminar servidor MCP
export async function deleteMCPServer(id: string): Promise<boolean> {
  // Detener si está corriendo
  await stopMCPServer(id);

  const servers = await loadMCPConfig();
  const filtered = servers.filter((s) => s.id !== id);

  if (filtered.length === servers.length) {
    return false;
  }

  await saveMCPConfig(filtered);
  return true;
}

// Iniciar servidor MCP
export async function startMCPServer(id: string): Promise<MCPServerStatus> {
  const server = await getMCPServer(id);

  if (!server) {
    return { id, name: "", running: false, error: "Server not found" };
  }

  if (!server.enabled) {
    return { id, name: server.name, running: false, error: "Server is disabled" };
  }

  // Si ya está corriendo, retornar estado actual
  const existingProcess = activeProcesses.get(id);
  if (existingProcess && !existingProcess.killed) {
    return {
      id,
      name: server.name,
      running: true,
      pid: existingProcess.pid,
      tools: serverTools.get(id),
    };
  }

  try {
    // Iniciar proceso
    const process = spawn(server.command, server.args || [], {
      env: { ...globalThis.process.env, ...server.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    activeProcesses.set(id, process);

    // Manejar salida
    process.on("exit", (code) => {
      console.log(`[MCP] Server ${server.name} exited with code ${code}`);
      activeProcesses.delete(id);
      serverTools.delete(id);
    });

    // Recopilar herramientas del servidor MCP
    // En una implementación real, aquí se comunicaría con el servidor MCP
    // para obtener la lista de herramientas disponibles
    const tools: MCPTool[] = [];
    serverTools.set(id, tools);

    return {
      id,
      name: server.name,
      running: true,
      pid: process.pid,
      tools,
    };
  } catch (error: any) {
    return {
      id,
      name: server.name,
      running: false,
      error: error.message,
    };
  }
}

// Detener servidor MCP
export async function stopMCPServer(id: string): Promise<MCPServerStatus> {
  const server = await getMCPServer(id);
  const process = activeProcesses.get(id);

  if (process && !process.killed) {
    process.kill();
    activeProcesses.delete(id);
    serverTools.delete(id);
  }

  return {
    id,
    name: server?.name || "",
    running: false,
  };
}

// Obtener estado de todos los servidores
export async function getAllMCPStatus(): Promise<MCPServerStatus[]> {
  const servers = await loadMCPConfig();
  const statuses: MCPServerStatus[] = [];

  for (const server of servers) {
    const process = activeProcesses.get(server.id);
    const isRunning = process && !process.killed;

    statuses.push({
      id: server.id,
      name: server.name,
      running: isRunning || false,
      pid: isRunning ? process?.pid : undefined,
      tools: serverTools.get(server.id),
    });
  }

  return statuses;
}

// Obtener todas las herramientas MCP disponibles
export async function getAllMCPTools(): Promise<MCPTool[]> {
  const allTools: MCPTool[] = [];

  for (const [serverId, tools] of serverTools) {
    const process = activeProcesses.get(serverId);
    if (process && !process.killed) {
      allTools.push(...tools);
    }
  }

  return allTools;
}

// Ejecutar herramienta MCP
export async function executeMCPTool(
  serverId: string,
  toolName: string,
  input: Record<string, any>
): Promise<{ success: boolean; result?: any; error?: string }> {
  const process = activeProcesses.get(serverId);

  if (!process || process.killed) {
    return { success: false, error: "Server not running" };
  }

  // En una implementación real, aquí se enviaría una solicitud JSON-RPC
  // al proceso MCP y se esperaría la respuesta
  try {
    // Placeholder para implementación MCP completa
    return {
      success: true,
      result: { message: `Tool ${toolName} executed (placeholder)` },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
