/**
 * Code Executor
 * Parsea respuestas de Claude y ejecuta/crea archivos automáticamente
 */

import fs from "fs";
import path from "path";

interface CodeBlock {
  language: string;
  filename: string | null;
  content: string;
  action: "create" | "update" | "unknown";
}

interface ExecutionResult {
  executed: boolean;
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}

/**
 * Parsea la respuesta de Claude y extrae bloques de código con sus paths
 */
export function parseCodeBlocks(response: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // Patrones para detectar archivos
  const patterns = [
    // Español e inglés: "Crear archivo `src/components/Button.tsx`:"
    /(?:crear|create|archivo|file)[:\s]*[`*]*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`*]*/gi,
    // Modificar: "Modificar `src/components/Button.tsx`"
    /(?:modificar|update|editar|edit|actualizar)[:\s]*[`*]*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`*]*/gi,
    // Ruta en backticks o asteriscos: **src/components/Button.tsx**
    /[`*]{1,2}([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`*]{1,2}/g,
    // Headers con rutas: ### Archivo: src/components/Button.tsx
    /#{1,3}\s*(?:Archivo:?\s*)?[`*]*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`*]*/gi,
    // Formato: // filename: src/Button.tsx
    /\/\/\s*(?:filename|file|path):\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)/gi,
  ];

  // Encontrar todos los bloques de código
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let lastIndex = 0;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const language = match[1] || "text";
    const content = match[2].trim();
    const beforeBlock = response.slice(
      Math.max(0, lastIndex),
      match.index
    );

    // Buscar nombre de archivo en el texto antes del bloque (últimas 500 chars)
    const contextBefore = beforeBlock.slice(-500);
    let filename: string | null = null;
    let action: "create" | "update" | "unknown" = "unknown";

    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      const allMatches = [...contextBefore.matchAll(new RegExp(pattern))];
      const patternMatch = allMatches.pop();

      if (patternMatch) {
        filename = patternMatch[1];

        // Determinar acción basada en el contexto
        const contextLower = contextBefore.toLowerCase();
        if (
          contextLower.includes("crear") ||
          contextLower.includes("create") ||
          contextLower.includes("nuevo") ||
          contextLower.includes("new")
        ) {
          action = "create";
        } else if (
          contextLower.includes("modificar") ||
          contextLower.includes("update") ||
          contextLower.includes("editar") ||
          contextLower.includes("edit") ||
          contextLower.includes("actualizar")
        ) {
          action = "update";
        }
        break;
      }
    }

    // También buscar en la primera línea del código (comentario con path)
    if (!filename) {
      const firstLineMatch = content.match(
        /^\/\/\s*(?:filename|file|path):\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)/i
      );
      if (firstLineMatch) {
        filename = firstLineMatch[1];
      }
    }

    // Si tiene filename o es código sustancial, agregar
    if (filename || (content.length > 50 && language !== "text" && language !== "bash" && language !== "sh")) {
      blocks.push({
        language,
        filename,
        content,
        action,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  return blocks;
}

/**
 * Ejecuta los bloques de código (crea/actualiza archivos)
 */
export async function parseAndExecuteCodeBlocks(options: {
  projectId: string;
  projectPath: string;
  response: string;
  autoExecute?: boolean;
}): Promise<ExecutionResult> {
  const { projectPath, response, autoExecute = false } = options;

  const result: ExecutionResult = {
    executed: false,
    filesCreated: [],
    filesUpdated: [],
    errors: [],
  };

  if (!autoExecute) {
    return result;
  }

  const blocks = parseCodeBlocks(response);

  for (const block of blocks) {
    if (!block.filename) {
      continue; // No podemos crear sin nombre de archivo
    }

    // Normalizar path (remover ./ inicial si existe)
    const normalizedPath = block.filename.replace(/^\.\//, "");
    const fullPath = path.join(projectPath, normalizedPath);

    try {
      // Crear directorios padre si no existen
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const exists = fs.existsSync(fullPath);

      // Escribir archivo
      fs.writeFileSync(fullPath, block.content, "utf-8");

      if (exists) {
        result.filesUpdated.push(normalizedPath);
      } else {
        result.filesCreated.push(normalizedPath);
      }

      result.executed = true;

      console.log(
        `[code-executor] ${exists ? "Updated" : "Created"}: ${normalizedPath}`
      );
    } catch (error: any) {
      const errorMsg = `Error con ${block.filename}: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(`[code-executor] ${errorMsg}`);
    }
  }

  return result;
}

/**
 * Extrae solo la información de los bloques sin ejecutar
 */
export function analyzeCodeBlocks(response: string): {
  blocks: CodeBlock[];
  hasExecutableCode: boolean;
  fileCount: number;
} {
  const blocks = parseCodeBlocks(response);
  const filesWithNames = blocks.filter((b) => b.filename !== null);

  return {
    blocks,
    hasExecutableCode: filesWithNames.length > 0,
    fileCount: filesWithNames.length,
  };
}
