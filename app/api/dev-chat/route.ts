import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { AVAILABLE_TOOLS } from "@/lib/file-operations-types";
import { getProject } from "@/lib/projects";
import { buildMemoryBankContext } from "@/lib/hierarchical-memory-bank";

// Tipos para el request body
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  model?: string;
  projectId?: string;
  currentService?: string; // Servicio actual para cargar contexto local
}

// Tipos para los eventos SSE
interface SSETokenEvent {
  type: "token";
  content: string;
}

interface SSEToolUseEvent {
  type: "tool_use";
  toolName: string;
  toolInput: any;
}

interface SSEToolResultEvent {
  type: "tool_result";
  toolName: string;
  result: string;
}

interface SSECompleteEvent {
  type: "complete";
  content: string;
}

interface SSEErrorEvent {
  type: "error";
  message: string;
}

type SSEEvent =
  | SSETokenEvent
  | SSEToolUseEvent
  | SSEToolResultEvent
  | SSECompleteEvent
  | SSEErrorEvent;

// Modelo de Claude por defecto
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

/**
 * Carga el Memory Bank de un proyecto específico o el global
 */
async function loadProjectMemoryBank(projectId?: string): Promise<{ exists: boolean; meta: string | null; files: Record<string, string>; consolidated: string; projectName?: string } | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (projectId) {
      // Cargar Memory Bank del proyecto específico
      const response = await fetch(`${baseUrl}/api/projects/${projectId}/memory-bank`, {
        method: "GET",
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.success ? data : null;
    }

    // Fallback al Memory Bank global
    const response = await fetch(`${baseUrl}/api/memory-bank`, {
      method: "GET",
    });

    const data = await response.json();

    if (!data.success || !data.initialized) return null;

    return {
      exists: true,
      meta: null,
      files: {},
      consolidated: data.consolidated || "",
    };
  } catch (error) {
    console.error("[dev-chat] Error cargando Memory Bank:", error);
    return null;
  }
}

/**
 * Carga el Memory Bank y construye el system prompt
 * Ahora soporta Memory Bank jerárquico (general + local por servicio)
 */
async function loadMemoryBankSystemPrompt(projectId?: string, currentService?: string): Promise<string> {
  // Intentar cargar Memory Bank jerárquico primero si hay projectId
  if (projectId) {
    try {
      const project = await getProject(projectId);
      if (project?.path) {
        const hierarchicalContext = await buildMemoryBankContext(
          project.path,
          project.name,
          currentService
        );

        if (hierarchicalContext && hierarchicalContext.includes("=== MEMORY BANK")) {
          return `Eres un asistente de desarrollo experto trabajando en este proyecto.

Proyecto: ${project.name}
${currentService ? `Servicio actual: ${currentService}` : ""}

${hierarchicalContext}

# INSTRUCCIONES PARA USO DEL MEMORY BANK JERÁRQUICO

1. **Memory Bank General**: Contiene visión de alto nivel del proyecto y documentación consolidada
2. **Memory Bank Local**: Cada servicio tiene su propio Memory Bank con detalle específico
3. **Sincronización**: Los cambios en Memory Banks locales se sincronizan automáticamente al general

## Al trabajar en un servicio:
- Lee primero el Memory Bank LOCAL del servicio
- Actualiza el Memory Bank LOCAL cuando hagas cambios
- El sync al general es automático

## Herramientas disponibles:
- read_file, write_file, list_files: Para archivos del proyecto
- execute_command: Para comandos npm, git, etc.
- read_memory_bank, update_memory_bank: Para el Memory Bank

Tienes acceso a herramientas para leer/escribir archivos, ejecutar comandos, y gestionar el Memory Bank. ¡Úsalas proactivamente!`;
        }
      }
    } catch (error) {
      console.error("[dev-chat] Error cargando Memory Bank jerárquico:", error);
    }
  }

  // Fallback al Memory Bank tradicional
  const memoryBank = await loadProjectMemoryBank(projectId);

  if (!memoryBank || !memoryBank.exists) {
    // Memory Bank no inicializado, retornar system prompt básico
    return `Eres un asistente de desarrollo experto. Tienes acceso a herramientas para:
- Leer y escribir archivos del proyecto
- Ejecutar comandos (npm, git, etc.)
- Gestionar un Memory Bank para contexto persistente

El Memory Bank NO está inicializado. Si el usuario menciona el proyecto, sugiere inicializar el Memory Bank para mantener contexto entre sesiones.`;
  }

  // Construir contexto del Memory Bank
  let memoryBankContext = "";

  // Si hay META, ponerlo primero con instrucciones especiales
  if (memoryBank.meta) {
    memoryBankContext += `## META-MEMORY-BANK.md (REGLAS CRÍTICAS)

${memoryBank.meta}

---

`;
  }

  // Agregar el resto de archivos
  if (memoryBank.files && Object.keys(memoryBank.files).length > 0) {
    for (const [fileName, content] of Object.entries(memoryBank.files)) {
      if (fileName !== "META-MEMORY-BANK.md") {
        memoryBankContext += `## ${fileName}

${content}

---

`;
      }
    }
  } else if (memoryBank.consolidated) {
    memoryBankContext = memoryBank.consolidated;
  }

  const projectInfo = memoryBank.projectName ? `\nProyecto: ${memoryBank.projectName}\n` : "";

  return `Eres un asistente de desarrollo experto trabajando en este proyecto.
${projectInfo}
# MEMORY BANK - CONTEXTO DEL PROYECTO

CRÍTICO: Antes de responder cualquier pregunta o implementar cualquier código:
1. Lee el contexto del Memory Bank proporcionado abajo
2. Sigue las reglas en META-MEMORY-BANK.md si existe
3. Actualiza el Memory Bank si el comportamiento cambia

=== MEMORY BANK CONTEXT ===

${memoryBankContext}
=== END MEMORY BANK ===

# INSTRUCCIONES PARA USO DEL MEMORY BANK

1. **Al inicio de conversaciones importantes**: USA la herramienta read_memory_bank() para obtener contexto actualizado del proyecto.

2. **Actualiza el Memory Bank cuando**:
   - Crees features importantes o archivos clave
   - Instales nuevas dependencias
   - Tomes decisiones técnicas significativas
   - Completes tareas o features
   - El usuario diga "recuerda que..." o "anota esto"
   - Cambies la arquitectura del proyecto
   - Encuentres o resuelvas bugs

3. **Usa las herramientas correctamente**:
   - read_memory_bank(): Lee todo el contexto
   - update_memory_bank(file, content): Sobrescribe un archivo completo
   - append_to_memory_bank(file, section, content): Agrega a una sección específica
   - get_memory_bank_status(): Verifica el estado

4. **Al final de tareas significativas**: Pregunta al usuario si quiere actualizar el Memory Bank con lo que se hizo.

5. **Comandos naturales del usuario**:
   - "actualiza el memory bank" → Actualizar archivos relevantes
   - "recuerda que [X]" → Agregar a archivo apropiado
   - "muéstrame el progreso" → Leer progress.md
   - "plan: [tarea]" → Entrar en modo planificación SIN ejecutar
   - "actúa" → Ejecutar el plan propuesto

6. **Modo planificación**: Si el usuario dice "plan:", NO ejecutes nada, solo propón pasos. Espera "actúa" para ejecutar.

7. **Mantén coherencia**: Usa el contexto del Memory Bank para dar respuestas coherentes con decisiones previas y el estado actual del proyecto. SIEMPRE asegúrate de que el código coincida con las especificaciones del Memory Bank.

Tienes acceso a herramientas para leer/escribir archivos, ejecutar comandos, y gestionar el Memory Bank. ¡Úsalas proactivamente!`;
}

/**
 * Ejecuta una herramienta (tool) llamando al endpoint correspondiente
 */
async function executeTool(toolName: string, toolInput: any): Promise<string> {
  console.log(`[dev-chat] Ejecutando herramienta: ${toolName}`, toolInput);

  try {
    let endpoint: string;
    let body: any;

    switch (toolName) {
      case "read_file":
        endpoint = "/api/files/read";
        body = { path: toolInput.path };
        break;

      case "write_file":
        endpoint = "/api/files/write";
        body = { path: toolInput.path, content: toolInput.content };
        break;

      case "list_files":
        endpoint = "/api/files/list";
        body = { path: toolInput.path || "." };
        break;

      case "execute_command":
        endpoint = "/api/commands";
        body = { command: toolInput.command };

        // Caso especial: comandos retornan streaming
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const cmdResponse = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        // Si hay error en la validación
        if (!cmdResponse.ok) {
          const errorData = await cmdResponse.json();
          return JSON.stringify(errorData);
        }

        // Consumir el stream completo
        const reader = cmdResponse.body?.getReader();
        const decoder = new TextDecoder();
        let stdout = "";
        let stderr = "";
        let exitCode = -1;
        let success = false;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const event = JSON.parse(line.slice(6));

                  if (event.type === "stdout") {
                    stdout += event.data;
                  } else if (event.type === "stderr") {
                    stderr += event.data;
                  } else if (event.type === "complete") {
                    exitCode = event.exitCode;
                    success = event.success;
                  }
                } catch (e) {
                  // Ignorar líneas no válidas
                }
              }
            }
          }
        }

        return JSON.stringify({
          success,
          command: toolInput.command,
          exitCode,
          stdout,
          stderr,
        });

      case "read_memory_bank":
        endpoint = "/api/memory-bank";
        // GET request
        const baseUrlRead = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const readResponse = await fetch(`${baseUrlRead}${endpoint}`, {
          method: "GET",
        });
        const readResult = await readResponse.json();
        console.log(`[dev-chat] Memory Bank leído:`, readResult.initialized ? "Inicializado" : "No inicializado");
        return JSON.stringify(readResult);

      case "update_memory_bank":
        endpoint = "/api/memory-bank";
        body = {
          file: toolInput.file,
          content: toolInput.content
        };
        break;

      case "append_to_memory_bank":
        endpoint = "/api/memory-bank";
        body = {
          file: toolInput.file,
          section: toolInput.section,
          content: toolInput.content,
          append: true
        };
        break;

      case "get_memory_bank_status":
        endpoint = "/api/memory-bank/status";
        // GET request
        const baseUrlStatus = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const statusResponse = await fetch(`${baseUrlStatus}${endpoint}`, {
          method: "GET",
        });
        const statusResult = await statusResponse.json();
        console.log(`[dev-chat] Memory Bank status:`, statusResult);
        return JSON.stringify(statusResult);

      default:
        return JSON.stringify({
          error: `Herramienta desconocida: ${toolName}`,
        });
    }

    // Hacer el fetch al endpoint local (para herramientas no-streaming)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log(`[dev-chat] Resultado de ${toolName}:`, result);

    return JSON.stringify(result);
  } catch (error: any) {
    console.error(`[dev-chat] Error ejecutando ${toolName}:`, error);
    return JSON.stringify({
      error: `Error al ejecutar ${toolName}: ${error.message}`,
    });
  }
}

/**
 * POST endpoint para el chat con Claude usando streaming (SSE) con herramientas
 *
 * @param req - NextRequest con el mensaje y el historial de conversación
 * @returns Response con streaming SSE
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Obtener API key del header (enviada por el cliente) o del entorno
    const clientApiKey = req.headers.get("x-api-key");
    const apiKey = clientApiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "API key no proporcionada. Por favor configura tu API key de Anthropic.",
        },
        { status: 401 }
      );
    }

    // 2. Parsear el body del request
    const body: ChatRequest = await req.json();
    const { message, conversationHistory = [], model, projectId, currentService } = body;

    // Usar el modelo del cliente o el default
    const claudeModel = model || DEFAULT_CLAUDE_MODEL;
    console.log("[dev-chat] Usando modelo:", claudeModel);
    if (projectId) {
      console.log("[dev-chat] Proyecto seleccionado:", projectId);
    }
    if (currentService) {
      console.log("[dev-chat] Servicio actual:", currentService);
    }

    // 3. Validar que exista el mensaje
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "El campo 'message' es requerido y debe ser un string no vacío",
        },
        { status: 400 }
      );
    }

    // 4. Cargar el system prompt con contexto del Memory Bank (del proyecto y servicio si están seleccionados)
    const systemPrompt = await loadMemoryBankSystemPrompt(projectId, currentService);
    console.log("[dev-chat] System prompt cargado, longitud:", systemPrompt.length);

    // 5. Inicializar el cliente de Anthropic
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // 6. Construir el array de mensajes para la API de Anthropic
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    // 7. Crear un ReadableStream para implementar Server-Sent Events (SSE)
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log("[dev-chat] Iniciando streaming con Anthropic...");
          console.log("[dev-chat] Herramientas disponibles:", AVAILABLE_TOOLS.length);

          // Loop para manejar múltiples rondas de tool use
          let continueLoop = true;
          let currentMessages = [...messages];

          while (continueLoop) {
            // 8. Crear mensaje con herramientas habilitadas y system prompt
            const response = await anthropic.messages.create({
              model: claudeModel,
              max_tokens: 4096,
              system: systemPrompt,
              messages: currentMessages,
              tools: AVAILABLE_TOOLS,
            });

            console.log("[dev-chat] Respuesta recibida, stop_reason:", response.stop_reason);

            // 9. Procesar el contenido de la respuesta
            let fullTextContent = "";
            const toolUses: any[] = [];

            for (const block of response.content) {
              if (block.type === "text") {
                // Enviar texto como tokens
                fullTextContent += block.text;

                const sseEvent: SSETokenEvent = {
                  type: "token",
                  content: block.text,
                };

                const sseData = `data: ${JSON.stringify(sseEvent)}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              } else if (block.type === "tool_use") {
                // Claude quiere usar una herramienta
                toolUses.push(block);

                // Notificar al cliente que se está usando una herramienta
                const toolUseEvent: SSEToolUseEvent = {
                  type: "tool_use",
                  toolName: block.name,
                  toolInput: block.input,
                };

                const toolUseData = `data: ${JSON.stringify(toolUseEvent)}\n\n`;
                controller.enqueue(encoder.encode(toolUseData));
              }
            }

            // 10. Si Claude usó herramientas, ejecutarlas y continuar la conversación
            if (response.stop_reason === "tool_use" && toolUses.length > 0) {
              console.log(`[dev-chat] Claude usó ${toolUses.length} herramientas`);

              // Agregar la respuesta de Claude al historial
              currentMessages.push({
                role: "assistant",
                content: response.content,
              });

              // Ejecutar cada herramienta y recopilar resultados
              const toolResults: Anthropic.ToolResultBlockParam[] = [];

              for (const toolUse of toolUses) {
                const result = await executeTool(toolUse.name, toolUse.input);

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: result,
                });

                // Notificar al cliente del resultado de la herramienta
                const toolResultEvent: SSEToolResultEvent = {
                  type: "tool_result",
                  toolName: toolUse.name,
                  result: result,
                };

                const toolResultData = `data: ${JSON.stringify(toolResultEvent)}\n\n`;
                controller.enqueue(encoder.encode(toolResultData));
              }

              // Agregar los resultados de las herramientas al historial
              currentMessages.push({
                role: "user",
                content: toolResults,
              });

              // Continuar el loop para obtener la siguiente respuesta de Claude
              continueLoop = true;
            } else {
              // Claude terminó de responder, salir del loop
              continueLoop = false;

              // Enviar evento de completitud
              const completeEvent: SSECompleteEvent = {
                type: "complete",
                content: fullTextContent,
              };

              const completeData = `data: ${JSON.stringify(completeEvent)}\n\n`;
              controller.enqueue(encoder.encode(completeData));
            }
          }

          // 11. Cerrar el stream
          controller.close();
          console.log("[dev-chat] Stream cerrado exitosamente");
        } catch (error) {
          console.error("[dev-chat] Error en el proceso:", error);

          const errorEvent: SSEErrorEvent = {
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Error desconocido durante el streaming",
          };

          const errorData = `data: ${JSON.stringify(errorEvent)}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },

      // Cancelar el stream si el cliente se desconecta
      cancel() {
        console.log("[dev-chat] Stream cancelado por el cliente");
      },
    });

    // 12. Retornar la respuesta con headers apropiados para SSE
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Deshabilitar buffering en nginx
      },
    });
  } catch (error) {
    // 13. Manejar errores a nivel de endpoint
    console.error("Error en el endpoint dev-chat:", error);

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
