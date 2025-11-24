# Sistema de Herramientas de Archivos para Claude

Este proyecto implementa un sistema completo que permite a Claude leer, escribir y listar archivos del proyecto directamente desde el chat.

## 📁 Arquitectura del Sistema

### Componentes Principales

1. **Endpoints de File Operations** (`/app/api/files/`)
   - `read/route.ts` - Lee archivos
   - `write/route.ts` - Escribe archivos con backups automáticos
   - `list/route.ts` - Lista directorios

2. **Endpoint de Chat Mejorado** (`/app/api/dev-chat/route.ts`)
   - Integra las herramientas de Anthropic (Tool Use)
   - Maneja el ciclo completo de tool calling
   - Streaming SSE con soporte para eventos de herramientas

3. **Tipos y Seguridad** (`/lib/`)
   - `file-operations-types.ts` - Tipos TypeScript y definiciones de herramientas
   - `file-security.ts` - Validación y seguridad de rutas

4. **Frontend** (`/app/dev/page.tsx`)
   - Maneja eventos SSE de herramientas
   - Muestra indicadores visuales cuando Claude usa herramientas

## 🔧 Herramientas Disponibles

### 1. `read_file`
Lee el contenido de un archivo del proyecto.

**Parámetros:**
- `path` (string): Ruta relativa del archivo (ej: "app/page.tsx")

**Ejemplo de uso por Claude:**
```
Usuario: "¿Qué contiene el archivo package.json?"
Claude: [usa read_file con path="package.json"]
Claude: "El archivo package.json contiene las siguientes dependencias..."
```

### 2. `write_file`
Escribe o modifica un archivo del proyecto.

**Parámetros:**
- `path` (string): Ruta relativa del archivo
- `content` (string): Contenido completo a escribir

**Características:**
- ✅ Crea backup automático en `.backups/` antes de sobrescribir
- ✅ Crea directorios padres si no existen
- ✅ Validación de seguridad

**Ejemplo de uso por Claude:**
```
Usuario: "Crea un archivo utils.ts con una función para formatear fechas"
Claude: [usa write_file con path="lib/utils.ts" y el contenido generado]
Claude: "He creado el archivo utils.ts con la función formatDate..."
```

### 3. `list_files`
Lista archivos y directorios en una ruta.

**Parámetros:**
- `path` (string): Ruta del directorio (usa "." para la raíz)

**Ejemplo de uso por Claude:**
```
Usuario: "¿Qué archivos hay en la carpeta app?"
Claude: [usa list_files con path="app"]
Claude: "La carpeta app contiene: page.tsx, layout.tsx, api/..."
```

## 🔒 Seguridad

### Protecciones Implementadas

1. **Validación de Rutas**
   - Solo permite acceso dentro del proyecto (`validatePath`)
   - Previene path traversal attacks (`../../../etc/passwd`)

2. **Archivos Prohibidos**
   - ❌ `.env`, `.env.local` (credenciales)
   - ❌ `node_modules/` (librerías)
   - ❌ `.git/` (control de versiones)
   - ❌ `.next/` (build artifacts)
   - ❌ Archivos `.key`, `.pem`, `.cert` (certificados)

3. **Backups Automáticos**
   - Antes de sobrescribir cualquier archivo, se crea un backup en `.backups/`
   - Nombre de backup incluye timestamp para trazabilidad

### Función de Validación

```typescript
// lib/file-security.ts
export function validatePath(userPath: string): string {
  // Normaliza y resuelve la ruta
  const absolutePath = path.resolve(PROJECT_ROOT, userPath);

  // Verifica que esté dentro del proyecto
  if (!absolutePath.startsWith(PROJECT_ROOT)) {
    throw new Error("Acceso denegado: ruta fuera del proyecto");
  }

  // Verifica archivos prohibidos
  // ...

  return absolutePath;
}
```

## 🔄 Flujo de Tool Use

### Diagrama del Proceso

```
1. Usuario envía mensaje
   ↓
2. Frontend → POST /api/dev-chat
   ↓
3. Backend llama a Anthropic con tools definidas
   ↓
4. Claude decide usar una herramienta
   ↓
5. Backend ejecuta herramienta (fetch a /api/files/*)
   ↓
6. Backend envía resultado de vuelta a Anthropic
   ↓
7. Claude continúa con su respuesta usando el resultado
   ↓
8. Stream de respuesta final al frontend
```

### Código del Flujo (Simplificado)

```typescript
// app/api/dev-chat/route.ts
while (continueLoop) {
  // Llamar a Claude con herramientas
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    messages: currentMessages,
    tools: AVAILABLE_TOOLS, // 👈 Herramientas disponibles
  });

  // Si Claude usó una herramienta
  if (response.stop_reason === "tool_use") {
    // Ejecutar cada herramienta
    for (const toolUse of toolUses) {
      const result = await executeTool(toolUse.name, toolUse.input);
      toolResults.push({ tool_use_id: toolUse.id, content: result });
    }

    // Agregar resultados al historial
    currentMessages.push({ role: "user", content: toolResults });

    // Continuar loop para obtener respuesta final de Claude
    continueLoop = true;
  } else {
    // Claude terminó, enviar respuesta final
    continueLoop = false;
  }
}
```

## 📡 Eventos SSE

### Tipos de Eventos

1. **`token`** - Fragmento de texto de la respuesta
   ```json
   { "type": "token", "content": "Hola, estoy " }
   ```

2. **`tool_use`** - Claude está usando una herramienta
   ```json
   {
     "type": "tool_use",
     "toolName": "read_file",
     "toolInput": { "path": "package.json" }
   }
   ```

3. **`tool_result`** - Resultado de la herramienta
   ```json
   {
     "type": "tool_result",
     "toolName": "read_file",
     "result": "{\"success\":true,\"content\":\"...\"}"
   }
   ```

4. **`complete`** - Respuesta completada
   ```json
   { "type": "complete", "content": "Respuesta completa..." }
   ```

5. **`error`** - Error durante el procesamiento
   ```json
   { "type": "error", "message": "Descripción del error" }
   ```

## 🧪 Ejemplos de Uso

### Ejemplo 1: Leer un archivo

**Usuario:**
```
¿Qué hay en el archivo README.md?
```

**Proceso:**
1. Claude decide usar `read_file` con `path="README.md"`
2. Backend llama a `/api/files/read`
3. Endpoint lee el archivo y retorna el contenido
4. Claude recibe el contenido y lo resume para el usuario

**Logs del servidor:**
```
[dev-chat] Herramientas disponibles: 3
[dev-chat] Respuesta recibida, stop_reason: tool_use
[dev-chat] Claude usó 1 herramientas
[dev-chat] Ejecutando herramienta: read_file { path: 'README.md' }
[files/read] Solicitud de lectura: README.md
[files/read] Archivo leído exitosamente: README.md (1234 caracteres)
```

### Ejemplo 2: Crear un archivo nuevo

**Usuario:**
```
Crea un archivo lib/formatters.ts con una función para formatear números
```

**Proceso:**
1. Claude genera el código de la función
2. Claude decide usar `write_file` con el código generado
3. Backend llama a `/api/files/write`
4. Endpoint crea el archivo (sin backup porque es nuevo)
5. Claude confirma la creación al usuario

**Logs del servidor:**
```
[dev-chat] Ejecutando herramienta: write_file
[files/write] Solicitud de escritura: lib/formatters.ts
[files/write] Archivo escrito exitosamente: lib/formatters.ts (456 caracteres)
```

### Ejemplo 3: Modificar un archivo existente

**Usuario:**
```
Agrega una función capitalizeText al archivo lib/utils.ts
```

**Proceso:**
1. Claude usa `read_file` para leer el contenido actual
2. Claude genera el nuevo contenido con la función agregada
3. Claude usa `write_file` para guardar el archivo modificado
4. Backend crea backup automáticamente
5. Claude confirma la modificación

**Logs del servidor:**
```
[dev-chat] Ejecutando herramienta: read_file { path: 'lib/utils.ts' }
[files/read] Archivo leído exitosamente: lib/utils.ts
[dev-chat] Ejecutando herramienta: write_file
[files/write] Backup creado: .backups/lib_utils.ts_2025-11-24T04-30-00-000Z
[files/write] Archivo actualizado exitosamente
```

### Ejemplo 4: Explorar estructura del proyecto

**Usuario:**
```
Muéstrame la estructura de carpetas del proyecto
```

**Proceso:**
1. Claude usa `list_files` con `path="."`
2. Backend lista archivos en la raíz
3. Claude puede usar `list_files` recursivamente para subcarpetas
4. Claude presenta la estructura al usuario

## 📝 Tipos TypeScript

### Definición de Herramienta

```typescript
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
  description: "Lee el contenido de un archivo del proyecto...",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Ruta relativa del archivo...",
      },
    },
    required: ["path"],
  },
};
```

### Respuestas de Endpoints

```typescript
export interface FileReadResponse {
  success: boolean;
  exists: boolean;
  content?: string;
  error?: string;
  path: string;
}

export interface FileWriteResponse {
  success: boolean;
  message: string;
  backupPath?: string;
  error?: string;
  path: string;
}

export interface FileListResponse {
  success: boolean;
  entries: FileEntry[];
  error?: string;
  path: string;
}
```

## 🚀 Próximas Mejoras

1. **Búsqueda de archivos** - Herramienta para buscar texto en archivos (grep)
2. **Operaciones Git** - Herramientas para ver cambios, commits, etc.
3. **Ejecución de comandos** - Permitir a Claude ejecutar comandos del sistema (con restricciones)
4. **Análisis de dependencias** - Herramienta para analizar package.json y node_modules
5. **UI mejorada** - Mostrar mejor los indicadores de uso de herramientas en el chat

## 🐛 Troubleshooting

### Claude no usa las herramientas

**Problema:** Claude responde sin usar herramientas cuando debería.

**Solución:**
- Verifica que `AVAILABLE_TOOLS` esté siendo pasado a `anthropic.messages.create()`
- Revisa los logs del servidor: debería mostrar "Herramientas disponibles: 3"
- Asegúrate de estar usando el modelo correcto (Claude Sonnet 4.5)

### Error 403 al leer/escribir archivo

**Problema:** "Acceso denegado: La ruta está fuera del proyecto"

**Solución:**
- Verifica que la ruta sea relativa, no absoluta
- No uses `..` para salir del proyecto
- Revisa la lista de archivos prohibidos en `file-security.ts`

### Backups no se están creando

**Problema:** No se encuentran backups en `.backups/`

**Solución:**
- Los backups solo se crean cuando se sobrescribe un archivo existente
- Verifica que el archivo exista antes de modificarlo
- Revisa los logs: debería mostrar "[files/write] Backup creado: ..."

## 📚 Referencias

- [Anthropic Tool Use Documentation](https://docs.anthropic.com/claude/docs/tool-use)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
