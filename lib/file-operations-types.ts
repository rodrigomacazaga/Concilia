/**
 * Tipos TypeScript para operaciones de archivos
 * Usados por los endpoints de file operations y el chat con herramientas
 */

// ============================================================================
// File Read
// ============================================================================

export interface FileReadRequest {
  path: string;
}

export interface FileReadResponse {
  success: boolean;
  exists: boolean;
  content?: string;
  error?: string;
  path: string;
}

// ============================================================================
// File Write
// ============================================================================

export interface FileWriteRequest {
  path: string;
  content: string;
}

export interface FileWriteResponse {
  success: boolean;
  message: string;
  backupPath?: string;
  error?: string;
  path: string;
}

// ============================================================================
// File List
// ============================================================================

export interface FileListRequest {
  path: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  extension?: string;
}

export interface FileListResponse {
  success: boolean;
  entries: FileEntry[];
  error?: string;
  path: string;
}

// ============================================================================
// Anthropic Tools Definitions
// ============================================================================

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

export const READ_FILE_TOOL: AnthropicTool = {
  name: "read_file",
  description: "Lee el contenido de un archivo del proyecto. Proporciona la ruta relativa desde la raíz del proyecto.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Ruta relativa del archivo desde la raíz del proyecto (ej: 'app/page.tsx', 'lib/utils.ts')",
      },
    },
    required: ["path"],
  },
};

export const WRITE_FILE_TOOL: AnthropicTool = {
  name: "write_file",
  description: "Escribe o modifica un archivo del proyecto. IMPORTANTE: Esto sobrescribirá el archivo existente (se crea un backup automático). Proporciona la ruta y el contenido completo del archivo.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Ruta relativa del archivo desde la raíz del proyecto",
      },
      content: {
        type: "string",
        description: "Contenido completo del archivo a escribir",
      },
    },
    required: ["path", "content"],
  },
};

export const LIST_FILES_TOOL: AnthropicTool = {
  name: "list_files",
  description: "Lista archivos y carpetas en un directorio del proyecto. Útil para explorar la estructura del proyecto.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Ruta relativa del directorio desde la raíz del proyecto (ej: 'app/', 'lib/'). Usa '.' para la raíz.",
      },
    },
    required: ["path"],
  },
};

export const EXECUTE_COMMAND_TOOL: AnthropicTool = {
  name: "execute_command",
  description: "Ejecuta un comando en la terminal del proyecto. COMANDOS PERMITIDOS: npm (install, run, build, test), git (status, add, commit, push, pull, diff), cat, ls, pwd, echo, node, npx. BLOQUEADOS: rm, sudo, chmod, etc. El comando se ejecuta en el directorio raíz del proyecto con timeout de 60 segundos.",
  input_schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Comando a ejecutar (ej: 'npm install axios', 'git status', 'npm run build'). Solo comandos simples, sin pipes ni redirecciones.",
      },
    },
    required: ["command"],
  },
};

export const READ_MEMORY_BANK_TOOL: AnthropicTool = {
  name: "read_memory_bank",
  description: "Lee todo el Memory Bank del proyecto (contexto persistente). Retorna información sobre el proyecto, decisiones técnicas, progreso, bugs conocidos, etc. USA ESTA HERRAMIENTA AL INICIO de conversaciones importantes para obtener contexto completo del proyecto.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export const UPDATE_MEMORY_BANK_TOOL: AnthropicTool = {
  name: "update_memory_bank",
  description: "Actualiza un archivo específico del Memory Bank. USA ESTA HERRAMIENTA cuando: crees features importantes, instales dependencias, tomes decisiones técnicas, completes tareas, o el usuario diga 'recuerda que...'. Archivos disponibles: projectBrief.md, productContext.md, techContext.md, systemPatterns.md, activeContext.md, progress.md, decisionLog.md, knownIssues.md",
  input_schema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "Nombre del archivo a actualizar (ej: 'projectBrief.md', 'decisionLog.md')",
      },
      content: {
        type: "string",
        description: "Contenido completo del archivo actualizado (en formato markdown)",
      },
    },
    required: ["file", "content"],
  },
};

export const APPEND_TO_MEMORY_BANK_TOOL: AnthropicTool = {
  name: "append_to_memory_bank",
  description: "Agrega contenido a una sección específica de un archivo del Memory Bank sin sobrescribir todo. Útil para agregar una nueva decisión, un nuevo bug, o actualizar una sección específica.",
  input_schema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "Nombre del archivo (ej: 'decisionLog.md', 'knownIssues.md')",
      },
      section: {
        type: "string",
        description: "Nombre de la sección donde agregar contenido (ej: 'Bugs Conocidos', 'Decisiones Técnicas')",
      },
      content: {
        type: "string",
        description: "Contenido a agregar en formato markdown",
      },
    },
    required: ["file", "section", "content"],
  },
};

export const GET_MEMORY_BANK_STATUS_TOOL: AnthropicTool = {
  name: "get_memory_bank_status",
  description: "Obtiene el estado del Memory Bank: si está inicializado, porcentaje de completitud, archivos existentes. Útil para verificar si hay contexto disponible antes de leer.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

// Array de todas las herramientas disponibles
export const AVAILABLE_TOOLS: AnthropicTool[] = [
  READ_FILE_TOOL,
  WRITE_FILE_TOOL,
  LIST_FILES_TOOL,
  EXECUTE_COMMAND_TOOL,
  READ_MEMORY_BANK_TOOL,
  UPDATE_MEMORY_BANK_TOOL,
  APPEND_TO_MEMORY_BANK_TOOL,
  GET_MEMORY_BANK_STATUS_TOOL,
];

// ============================================================================
// Tool Use Types (para mensajes de Anthropic)
// ============================================================================

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}
