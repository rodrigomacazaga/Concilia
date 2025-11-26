import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { AVAILABLE_TOOLS } from "@/lib/file-operations-types";
import { getProject } from "@/lib/projects";
import { buildMemoryBankContext } from "@/lib/hierarchical-memory-bank";
import {
  AIProvider,
  getProviderFromModel,
  PROVIDERS,
} from "@/lib/ai-providers";
import { Mode, MODE_CONFIGS, loadModeContext } from "@/lib/modes";
import { designSystemPostHook, HookResult } from "@/lib/design-system";
import { parseAndExecuteCodeBlocks, analyzeCodeBlocks } from "@/lib/code-executor";

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
  currentService?: string;
  mode?: Mode;  // 'chat' | 'execute' | 'deepThink'
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

interface SSEDesignSystemEvent {
  type: "design_system";
  analyzed: boolean;
  newComponents: number;
  violations: number;
  updated: boolean;
  suggestions: string[];
}

interface SSECodeExecutionEvent {
  type: "code_execution";
  executed: boolean;
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}

type SSEEvent =
  | SSETokenEvent
  | SSEToolUseEvent
  | SSEToolResultEvent
  | SSECompleteEvent
  | SSEErrorEvent
  | SSEDesignSystemEvent
  | SSECodeExecutionEvent;

// Modelo por defecto
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

/**
 * Carga el Memory Bank de un proyecto específico o el global
 */
async function loadProjectMemoryBank(
  projectId?: string
): Promise<{
  exists: boolean;
  meta: string | null;
  files: Record<string, string>;
  consolidated: string;
  projectName?: string;
} | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (projectId) {
      const response = await fetch(
        `${baseUrl}/api/projects/${projectId}/memory-bank`,
        {
          method: "GET",
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.success ? data : null;
    }

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
 */
async function loadMemoryBankSystemPrompt(
  projectId?: string,
  currentService?: string
): Promise<string> {
  if (projectId) {
    try {
      const project = await getProject(projectId);
      if (project?.path) {
        const hierarchicalContext = await buildMemoryBankContext(
          project.path,
          project.name,
          currentService
        );

        if (
          hierarchicalContext &&
          hierarchicalContext.includes("=== MEMORY BANK")
        ) {
          return `Eres Juliet, un asistente de desarrollo experto trabajando en este proyecto.

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

  const memoryBank = await loadProjectMemoryBank(projectId);

  if (!memoryBank || !memoryBank.exists) {
    return `Eres Juliet, un asistente de desarrollo experto. Tienes acceso a herramientas para:
- Leer y escribir archivos del proyecto
- Ejecutar comandos (npm, git, etc.)
- Gestionar un Memory Bank para contexto persistente

El Memory Bank NO está inicializado. Si el usuario menciona el proyecto, sugiere inicializar el Memory Bank para mantener contexto entre sesiones.`;
  }

  let memoryBankContext = "";

  if (memoryBank.meta) {
    memoryBankContext += `## META-MEMORY-BANK.md (REGLAS CRÍTICAS)

${memoryBank.meta}

---

`;
  }

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

  const projectInfo = memoryBank.projectName
    ? `\nProyecto: ${memoryBank.projectName}\n`
    : "";

  return `Eres Juliet, un asistente de desarrollo experto trabajando en este proyecto.
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

7. **Mantén coherencia**: Usa el contexto del Memory Bank para dar respuestas coherentes con decisiones previas y el estado actual del proyecto.

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

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const cmdResponse = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!cmdResponse.ok) {
          const errorData = await cmdResponse.json();
          return JSON.stringify(errorData);
        }

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
        const baseUrlRead =
          process.env.NEXTAUTH_URL || "http://localhost:3000";
        const readResponse = await fetch(`${baseUrlRead}${endpoint}`, {
          method: "GET",
        });
        const readResult = await readResponse.json();
        console.log(
          `[dev-chat] Memory Bank leído:`,
          readResult.initialized ? "Inicializado" : "No inicializado"
        );
        return JSON.stringify(readResult);

      case "update_memory_bank":
        endpoint = "/api/memory-bank";
        body = {
          file: toolInput.file,
          content: toolInput.content,
        };
        break;

      case "append_to_memory_bank":
        endpoint = "/api/memory-bank";
        body = {
          file: toolInput.file,
          section: toolInput.section,
          content: toolInput.content,
          append: true,
        };
        break;

      case "get_memory_bank_status":
        endpoint = "/api/memory-bank/status";
        const baseUrlStatus =
          process.env.NEXTAUTH_URL || "http://localhost:3000";
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
 * Handler para Anthropic (Claude)
 * Returns the full response content for post-processing
 */
async function handleAnthropicChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  let continueLoop = true;
  let currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  while (continueLoop) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: currentMessages,
      tools: AVAILABLE_TOOLS,
    });

    console.log(
      "[dev-chat] Anthropic respuesta, stop_reason:",
      response.stop_reason
    );

    let fullTextContent = "";
    const toolUses: any[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        fullTextContent += block.text;

        const sseEvent: SSETokenEvent = {
          type: "token",
          content: block.text,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(sseEvent)}\n\n`)
        );
      } else if (block.type === "tool_use") {
        toolUses.push(block);

        const toolUseEvent: SSEToolUseEvent = {
          type: "tool_use",
          toolName: block.name,
          toolInput: block.input,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(toolUseEvent)}\n\n`)
        );
      }
    }

    if (response.stop_reason === "tool_use" && toolUses.length > 0) {
      console.log(`[dev-chat] Anthropic usó ${toolUses.length} herramientas`);

      currentMessages.push({
        role: "assistant",
        content: response.content,
      });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUses) {
        const result = await executeTool(toolUse.name, toolUse.input);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });

        const toolResultEvent: SSEToolResultEvent = {
          type: "tool_result",
          toolName: toolUse.name,
          result: result,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(toolResultEvent)}\n\n`)
        );
      }

      currentMessages.push({
        role: "user",
        content: toolResults,
      });

      continueLoop = true;
    } else {
      continueLoop = false;

      const completeEvent: SSECompleteEvent = {
        type: "complete",
        content: fullTextContent,
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`)
      );

      return fullTextContent;
    }
  }

  return "";
}

/**
 * Handler para OpenAI (GPT)
 * Returns the full response content for post-processing
 */
async function handleOpenAIChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  // Convertir herramientas al formato OpenAI
  const openaiTools: OpenAI.ChatCompletionTool[] = AVAILABLE_TOOLS.map(
    (tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema as OpenAI.FunctionParameters,
      },
    })
  );

  let continueLoop = true;
  let currentMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  while (continueLoop) {
    // Algunos modelos o1 no soportan streaming ni tools
    const supportsStreaming = !model.startsWith("o1");
    const supportsTools = !model.startsWith("o1");

    const response = await openai.chat.completions.create({
      model,
      messages: currentMessages,
      ...(supportsTools && { tools: openaiTools }),
      ...(supportsStreaming && { stream: true }),
    });

    let fullTextContent = "";

    if (supportsStreaming) {
      // Manejar streaming
      const toolCalls: Map<
        number,
        { id: string; name: string; arguments: string }
      > = new Map();

      for await (const chunk of response as AsyncIterable<OpenAI.ChatCompletionChunk>) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullTextContent += delta.content;
          const sseEvent: SSETokenEvent = {
            type: "token",
            content: delta.content,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(sseEvent)}\n\n`)
          );
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCalls.get(tc.index);
            if (existing) {
              existing.arguments += tc.function?.arguments || "";
            } else {
              toolCalls.set(tc.index, {
                id: tc.id || "",
                name: tc.function?.name || "",
                arguments: tc.function?.arguments || "",
              });
            }
          }
        }

        if (chunk.choices[0]?.finish_reason === "tool_calls") {
          // Ejecutar las herramientas
          const toolResults: OpenAI.ChatCompletionMessageParam[] = [];

          currentMessages.push({
            role: "assistant",
            content: fullTextContent || null,
            tool_calls: Array.from(toolCalls.values()).map((tc, index) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: tc.arguments,
              },
            })),
          });

          for (const [, tc] of toolCalls) {
            const toolUseEvent: SSEToolUseEvent = {
              type: "tool_use",
              toolName: tc.name,
              toolInput: JSON.parse(tc.arguments || "{}"),
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(toolUseEvent)}\n\n`)
            );

            const result = await executeTool(
              tc.name,
              JSON.parse(tc.arguments || "{}")
            );

            toolResults.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result,
            });

            const toolResultEvent: SSEToolResultEvent = {
              type: "tool_result",
              toolName: tc.name,
              result: result,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(toolResultEvent)}\n\n`)
            );
          }

          currentMessages.push(...toolResults);
          continueLoop = true;
          break;
        }

        if (chunk.choices[0]?.finish_reason === "stop") {
          continueLoop = false;
          const completeEvent: SSECompleteEvent = {
            type: "complete",
            content: fullTextContent,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`)
          );
        }
      }
    } else {
      // Sin streaming (para modelos o1)
      const nonStreamResponse =
        response as OpenAI.Chat.Completions.ChatCompletion;
      const choice = nonStreamResponse.choices[0];

      if (choice?.message?.content) {
        fullTextContent = choice.message.content;
        const sseEvent: SSETokenEvent = {
          type: "token",
          content: fullTextContent,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(sseEvent)}\n\n`)
        );
      }

      continueLoop = false;
      const completeEvent: SSECompleteEvent = {
        type: "complete",
        content: fullTextContent,
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`)
      );

      return fullTextContent;
    }
  }

  return "";
}

/**
 * Handler para Google (Gemini)
 * Returns the full response content for post-processing
 */
async function handleGoogleChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const gemini = genAI.getGenerativeModel({ model });

  // Convertir historial al formato de Gemini
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = gemini.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 8192,
    },
  });

  // Agregar system prompt al primer mensaje si hay historial vacío
  const prompt =
    history.length === 0
      ? `${systemPrompt}\n\n${lastMessage.content}`
      : lastMessage.content;

  const result = await chat.sendMessageStream(prompt);

  let fullTextContent = "";

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullTextContent += text;
      const sseEvent: SSETokenEvent = {
        type: "token",
        content: text,
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(sseEvent)}\n\n`)
      );
    }
  }

  const completeEvent: SSECompleteEvent = {
    type: "complete",
    content: fullTextContent,
  };
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`)
  );

  return fullTextContent;
}

/**
 * POST endpoint para el chat con múltiples proveedores de IA usando streaming (SSE)
 */
export async function POST(req: NextRequest) {
  try {
    // Parsear el body del request
    const body: ChatRequest = await req.json();
    const {
      message,
      conversationHistory = [],
      model = DEFAULT_MODEL,
      projectId,
      currentService,
      mode = "chat",  // Default to chat mode
    } = body;

    // Detectar proveedor basado en el modelo
    const provider = getProviderFromModel(model);
    console.log(`[dev-chat] Proveedor: ${provider}, Modelo: ${model}, Modo: ${mode}`);

    // Obtener API key del header correspondiente
    let apiKey: string | null = null;

    switch (provider) {
      case "anthropic":
        apiKey =
          req.headers.get("x-anthropic-key") ||
          req.headers.get("x-api-key") ||
          process.env.ANTHROPIC_API_KEY ||
          null;
        break;
      case "google":
        apiKey =
          req.headers.get("x-google-key") ||
          process.env.GOOGLE_API_KEY ||
          null;
        break;
      case "openai":
        apiKey =
          req.headers.get("x-openai-key") ||
          process.env.OPENAI_API_KEY ||
          null;
        break;
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `API key no proporcionada para ${PROVIDERS[provider].name}. Por favor configura tu API key.`,
        },
        { status: 401 }
      );
    }

    // Validar mensaje
    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "El campo 'message' es requerido y debe ser un string no vacío",
        },
        { status: 400 }
      );
    }

    // Cargar system prompt basado en el modo
    let systemPrompt: string;

    if (projectId) {
      // Intentar usar el nuevo sistema de modos
      try {
        const project = await getProject(projectId);
        if (project?.path) {
          const modeContext = await loadModeContext(
            mode,
            project.path,
            project.name,
            currentService || null,
            model
          );
          systemPrompt = modeContext.systemPrompt;
          console.log(`[dev-chat] Modo ${mode} cargado, tokens estimados: ${modeContext.estimatedTokens}`);
        } else {
          // Fallback al sistema anterior
          systemPrompt = await loadMemoryBankSystemPrompt(projectId, currentService);
        }
      } catch (error) {
        console.error("[dev-chat] Error cargando modo, usando fallback:", error);
        systemPrompt = await loadMemoryBankSystemPrompt(projectId, currentService);
      }
    } else {
      // Sin proyecto, usar prompt basico
      systemPrompt = await loadMemoryBankSystemPrompt(projectId, currentService);
    }

    console.log("[dev-chat] System prompt cargado, longitud:", systemPrompt.length);

    // Construir mensajes
    const messages = [
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

    // Obtener project path para el hook de Design System
    let projectPath: string | null = null;
    if (projectId) {
      try {
        const project = await getProject(projectId);
        projectPath = project?.path || null;
      } catch {
        // Ignorar error
      }
    }

    // Crear stream
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log("[dev-chat] Iniciando streaming con", provider);

          let fullContent = "";

          switch (provider) {
            case "anthropic":
              fullContent = await handleAnthropicChat(
                apiKey!,
                model,
                systemPrompt,
                messages,
                encoder,
                controller
              );
              break;
            case "openai":
              fullContent = await handleOpenAIChat(
                apiKey!,
                model,
                systemPrompt,
                messages,
                encoder,
                controller
              );
              break;
            case "google":
              fullContent = await handleGoogleChat(
                apiKey!,
                model,
                systemPrompt,
                messages,
                encoder,
                controller
              );
              break;
          }

          // === HOOK: Auto-actualizar Design System ===
          if (projectPath && (mode === 'execute' || mode === 'deepThink')) {
            try {
              const dsResult = await designSystemPostHook({
                projectPath,
                generatedCode: fullContent,
                autoUpdate: true,
                mode
              });

              if (dsResult.analyzed) {
                console.log(`[dev-chat] Design System: ${dsResult.newComponents} nuevos, ${dsResult.violations} violaciones`);

                const dsEvent: SSEDesignSystemEvent = {
                  type: "design_system",
                  analyzed: dsResult.analyzed,
                  newComponents: dsResult.newComponents,
                  violations: dsResult.violations,
                  updated: dsResult.updated,
                  suggestions: dsResult.suggestions
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(dsEvent)}\n\n`)
                );
              }
            } catch (err) {
              console.error("[dev-chat] Design System hook error:", err);
            }
          }
          // === FIN HOOK Design System ===

          // === HOOK: Auto-ejecutar código ===
          if (projectPath && (mode === 'execute' || mode === 'deepThink')) {
            try {
              // Analizar si hay código ejecutable
              const codeAnalysis = analyzeCodeBlocks(fullContent);

              if (codeAnalysis.hasExecutableCode) {
                console.log(`[dev-chat] Código detectado: ${codeAnalysis.fileCount} archivos`);

                // Ejecutar automáticamente en modo execute/deepThink
                const executionResult = await parseAndExecuteCodeBlocks({
                  projectId: projectId || '',
                  projectPath,
                  response: fullContent,
                  autoExecute: true
                });

                if (executionResult.executed) {
                  console.log(`[dev-chat] Código ejecutado: ${executionResult.filesCreated.length} creados, ${executionResult.filesUpdated.length} actualizados`);

                  const codeEvent: SSECodeExecutionEvent = {
                    type: "code_execution",
                    executed: executionResult.executed,
                    filesCreated: executionResult.filesCreated,
                    filesUpdated: executionResult.filesUpdated,
                    errors: executionResult.errors
                  };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(codeEvent)}\n\n`)
                  );
                }
              }
            } catch (err) {
              console.error("[dev-chat] Code execution hook error:", err);
            }
          }
          // === FIN HOOK Code Execution ===

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

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );
          controller.close();
        }
      },

      cancel() {
        console.log("[dev-chat] Stream cancelado por el cliente");
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
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
