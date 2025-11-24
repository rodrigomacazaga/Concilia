import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// ============================================================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================================================

const PROJECT_ROOT = process.cwd();

// Lista blanca de comandos permitidos
const ALLOWED_COMMANDS = new Set([
  // npm
  "npm",
  // git
  "git",
  // utilidades básicas
  "cat",
  "ls",
  "pwd",
  "echo",
  "node",
  "npx",
  // build tools
  "tsc",
  "eslint",
  "prettier",
]);

// Lista negra de comandos peligrosos
const DANGEROUS_COMMANDS = new Set([
  "rm",
  "rmdir",
  "del",
  "sudo",
  "su",
  "chmod",
  "chown",
  "kill",
  "killall",
  "shutdown",
  "reboot",
  "init",
  "mkfs",
  "dd",
  "format",
  ":(){:|:&};:", // fork bomb
]);

// Subcomandos permitidos por comando
const ALLOWED_SUBCOMMANDS: Record<string, Set<string>> = {
  npm: new Set([
    "install",
    "i",
    "uninstall",
    "run",
    "start",
    "build",
    "test",
    "init",
    "list",
    "ls",
    "outdated",
    "update",
    "audit",
    "version",
  ]),
  git: new Set([
    "status",
    "add",
    "commit",
    "push",
    "pull",
    "diff",
    "log",
    "branch",
    "checkout",
    "clone",
    "fetch",
    "merge",
    "init",
    "remote",
  ]),
  npx: new Set([
    "tsc",
    "eslint",
    "prettier",
    "next",
  ]),
};

// Patrones peligrosos
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i,
  /rm\s+-r/i,
  />\s*\/dev\//i,
  /mkfs/i,
  /dd\s+if=/i,
  /:\(\)\{/i, // fork bomb pattern
  /eval\s*\(/i,
  /exec\s*\(/i,
];

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Valida que el comando sea seguro de ejecutar
 */
function validateCommand(commandString: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // Remover espacios extra
  const trimmed = commandString.trim();

  if (!trimmed) {
    return { valid: false, error: "Comando vacío" };
  }

  // Verificar patrones peligrosos
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: `Comando bloqueado: contiene patrón peligroso (${pattern})`,
      };
    }
  }

  // Verificar operadores de pipe/redirect peligrosos
  const dangerousOperators = ["|", ">", ">>", "<", "&&", "||", ";"];
  for (const op of dangerousOperators) {
    if (trimmed.includes(op)) {
      return {
        valid: false,
        error: `Operador '${op}' no está permitido por seguridad`,
      };
    }
  }

  // Parsear comando y argumentos
  const parts = trimmed.split(/\s+/);
  const baseCommand = parts[0];

  // Verificar que el comando base esté en la lista blanca
  if (!ALLOWED_COMMANDS.has(baseCommand)) {
    return {
      valid: false,
      error: `Comando '${baseCommand}' no está en la lista de comandos permitidos`,
    };
  }

  // Verificar que no sea un comando peligroso
  if (DANGEROUS_COMMANDS.has(baseCommand)) {
    return {
      valid: false,
      error: `Comando '${baseCommand}' está bloqueado por seguridad`,
    };
  }

  // Verificar subcomandos si aplica
  if (parts.length > 1 && ALLOWED_SUBCOMMANDS[baseCommand]) {
    const subcommand = parts[1];
    const allowedSubs = ALLOWED_SUBCOMMANDS[baseCommand];

    // Ignorar flags (empiezan con -)
    if (!subcommand.startsWith("-") && !allowedSubs.has(subcommand)) {
      return {
        valid: false,
        error: `Subcomando '${subcommand}' no está permitido para '${baseCommand}'`,
      };
    }
  }

  // Verificar que no haya intentos de salir del directorio del proyecto
  if (trimmed.includes("../") || trimmed.includes("..\\")) {
    return {
      valid: false,
      error: "No se permite navegar fuera del directorio del proyecto",
    };
  }

  // Verificar rutas absolutas sospechosas
  if (trimmed.match(/\/etc|\/bin|\/usr|\/sys|\/proc|C:\\Windows|C:\\Program/i)) {
    return {
      valid: false,
      error: "No se permite acceder a directorios del sistema",
    };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Ejecuta comando con timeout y retorna streaming
 */
async function executeCommandStreaming(
  command: string,
  timeoutMs: number = 60000
): Promise<ReadableStream> {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let timeoutId: NodeJS.Timeout;
      let isComplete = false;

      const sendEvent = (type: string, data: any) => {
        if (!isComplete) {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      };

      // Parsear comando
      const parts = command.split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      console.log(`[Commands] Ejecutando: ${cmd} ${args.join(" ")}`);
      sendEvent("start", { command });

      // Spawn process
      const childProcess = spawn(cmd, args, {
        cwd: PROJECT_ROOT,
        shell: false,
        env: {
          ...process.env,
          // Limitar variables de entorno
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          NODE_ENV: process.env.NODE_ENV,
        },
      });

      let stdout = "";
      let stderr = "";

      // Timeout
      timeoutId = setTimeout(() => {
        if (!isComplete) {
          console.log(`[Commands] Timeout alcanzado para: ${command}`);
          childProcess.kill("SIGTERM");
          sendEvent("error", {
            message: "Comando excedió el tiempo límite de 60 segundos",
          });
          isComplete = true;
          controller.close();
        }
      }, timeoutMs);

      // Stdout
      childProcess.stdout.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        sendEvent("stdout", { data: output });
      });

      // Stderr
      childProcess.stderr.on("data", (data) => {
        const output = data.toString();
        stderr += output;
        sendEvent("stderr", { data: output });
      });

      // Error
      childProcess.on("error", (error) => {
        console.error(`[Commands] Error ejecutando comando:`, error);
        clearTimeout(timeoutId);
        if (!isComplete) {
          sendEvent("error", { message: error.message });
          isComplete = true;
          controller.close();
        }
      });

      // Exit
      childProcess.on("close", (code) => {
        console.log(`[Commands] Comando finalizado con código: ${code}`);
        clearTimeout(timeoutId);
        if (!isComplete) {
          sendEvent("complete", {
            exitCode: code,
            stdout,
            stderr,
            success: code === 0,
          });
          isComplete = true;
          controller.close();
        }
      });
    },
  });
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body;

    console.log(`[Commands] Recibida solicitud: ${command}`);

    // Validar input
    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { success: false, error: "Comando inválido" },
        { status: 400 }
      );
    }

    // Validar comando
    const validation = validateCommand(command);
    if (!validation.valid) {
      console.warn(`[Commands] Comando bloqueado: ${command}`);
      console.warn(`[Commands] Razón: ${validation.error}`);
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 403 }
      );
    }

    // Ejecutar comando con streaming
    const stream = await executeCommandStreaming(validation.sanitized!);

    // Retornar SSE stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Commands] Error en endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
