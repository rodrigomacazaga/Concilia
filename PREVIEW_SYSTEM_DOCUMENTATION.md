# 📊 Sistema de Preview en Tiempo Real - Documentación

## 🎨 Diseño Visual de la Interfaz

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Chat de Desarrollo con Claude                      │
│                Desarrollo colaborativo potenciado por IA              │
├─────────────────────────────┬────────────────────────────────────────┤
│                             │                                        │
│   PANEL IZQUIERDO (50%)     │   PANEL DERECHO (50%)                 │
│   ═══════════════════       │   ═══════════════════                 │
│                             │                                        │
│   ┌───────────────────┐    │   ┌──┬──────────┬─────────┬─┐        │
│   │  ¡Hola! Soy Claude│    │   │▶ │ Preview  │ Archivos│X│        │
│   │                   │    │   ├──┴──────────┴─────────┴─┤        │
│   │  Chat messages    │ ║  │   │                         │        │
│   │  appear here...   │ ║  │   │   [Preview Tab]         │        │
│   │                   │ ║  │   │   ┌─────────────────┐   │        │
│   │  Usuario: Hola    │ ║  │   │   │                 │   │        │
│   │                   │ ║  │   │   │  iframe preview │   │        │
│   │  Claude: ...      │ ║  │   │   │  localhost:3000 │   │        │
│   │                   │ ║  │   │   │                 │   │        │
│   └───────────────────┘    │   │   └─────────────────┘   │        │
│                             │   │                         │        │
│   ┌───────────────────┐    │   └─────────────────────────┘        │
│   │ Envía un mensaje  │    │                                        │
│   │ [Send] ▶          │    │                                        │
│   └───────────────────┘    │                                        │
└─────────────────────────────┴────────────────────────────────────────┘
         ▲                                    ▲
         │                                    │
    Chat normal                      Preview Panel con tabs
```

## 🏗️ Arquitectura del Sistema

### 1. **Contexto Global** (`app/lib/DevContext.tsx`)

```typescript
interface DevContextType {
  // Archivos modificados por Claude
  fileChanges: FileChange[]
  addFileChange: (change: FileChange) => void

  // Archivo seleccionado en el viewer
  selectedFile: SelectedFile | null
  setSelectedFile: (file) => void

  // Estado del preview panel
  previewCollapsed: boolean
  leftPanelSize: number (30-70%)
  activePreviewTab: "preview" | "files" | "changes"

  // Sistema de notificaciones
  notifications: Notification[]
  addNotification: (notification) => void
}
```

### 2. **Componentes Creados**

#### A. **PreviewPanel.tsx** - Panel principal con tabs
- 3 tabs: Preview, Archivos, Cambios
- Botón para refrescar iframe
- Botón para colapsar panel
- Badges con contador de cambios

#### B. **FileExplorer.tsx** - Explorador de archivos
- Árbol de archivos navegable
- Carga dinámica de directorios
- Iconos según tipo de archivo:
  - 📁 Folder / FolderOpen
  - 📄 File (genérico)
  - 📝 FileCode (ts, tsx, js, jsx)
  - 📋 FileJson
  - 📃 FileText (md, txt)
- Resalta archivos modificados (punto naranja)
- Click para abrir archivo en CodeViewer

#### C. **CodeViewer.tsx** - Visor de código
- Syntax highlighting básico
- Números de línea
- Info del archivo (lenguaje, timestamp, líneas)
- Badge "Modificado" si el archivo cambió
- Highlighting para:
  - Keywords (import, export, const, etc.)
  - Strings
  - Comments
  - Numbers

#### D. **ChangesList.tsx** - Lista de cambios
- Muestra todos los cambios de la sesión
- Badges por acción:
  - 🆕 Creado (verde)
  - ✏️  Modificado (azul)
  - 🗑️  Eliminado (rojo)
- Botones por cambio:
  - 👁️  Ver archivo
  - ↩️  Revertir (si hay backup)
- Info de backup path

#### E. **NotificationToast.tsx** - Sistema de notificaciones
- Toasts en bottom-right
- Animaciones con framer-motion
- Auto-dismiss después de 5s
- Click para abrir archivo
- Tipos:
  - file_created (verde)
  - file_modified (azul)
  - error (rojo)

## 🎯 Flujo de Trabajo

### Escenario: Claude modifica un archivo

```
1. Usuario: "Crea un archivo lib/helpers.ts con una función sum"

2. Claude usa herramienta write_file

3. Backend ejecuta write_file → crea archivo

4. Backend retorna evento SSE: tool_result

5. Frontend detecta write_file en page.tsx:
   addFileChange({
     path: "lib/helpers.ts",
     action: "created",
     timestamp: new Date()
   })

6. DevContext dispara automáticamente:
   addNotification({
     type: "file_created",
     message: "Archivo creado: lib/helpers.ts",
     filePath: "lib/helpers.ts"
   })

7. NotificationToast muestra:
   ┌──────────────────────────┐
   │ 🆕 Archivo creado:       │
   │    lib/helpers.ts        │
   │    Click para ver        │
   └──────────────────────────┘

8. Usuario hace click en notificación:
   - setSelectedFile({ path, content, ... })
   - setActivePreviewTab("files")
   - Se abre el archivo en CodeViewer

9. ChangesList se actualiza:
   ┌──────────────────────────┐
   │ Cambios en esta Sesión   │
   │ 1 archivo modificado     │
   ├──────────────────────────┤
   │ 🆕 lib/helpers.ts        │
   │    Creado - 15:30:45     │
   │    [Ver] [Revertir]      │
   └──────────────────────────┘
```

## 🖱️ Interacciones del Usuario

### Redimensionar Paneles
```
1. Usuario arrastra divisor (|||)
2. handleMouseDown() → setIsDragging(true)
3. handleMouseMove() → calcula nuevo tamaño
4. leftPanelSize actualizado (30-70%)
5. Paneles se redimensionan en tiempo real
```

### Colapsar Preview
```
Click en [X] → previewCollapsed = true
→ Chat ocupa 100% del ancho
→ Preview panel se oculta
```

### Cambiar Tabs
```
Click en "Archivos" → activePreviewTab = "files"
→ Se muestra FileExplorer + CodeViewer

Click en "Cambios" → activePreviewTab = "changes"
→ Se muestra ChangesList

Click en "Preview" → activePreviewTab = "preview"
→ Se muestra iframe de localhost:3000
```

### Navegar Archivos
```
1. FileExplorer carga raíz (GET /api/files/list)
2. Usuario click en carpeta "app"
   → Carga children (GET /api/files/list)
   → Expande carpeta
3. Usuario click en "page.tsx"
   → GET /api/files/read
   → setSelectedFile({ path, content })
   → CodeViewer muestra el archivo
```

### Revertir Cambio
```
1. Usuario click en "Revertir" en ChangesList
2. Confirmación: "¿Estás seguro?"
3. GET /api/files/read (backup file)
4. POST /api/files/write (restore original)
5. Notificación: "Archivo revertido exitosamente"
```

## 📁 Estructura de Archivos Creados

```
app/
├── lib/
│   └── DevContext.tsx ✨ Nuevo - Estado global
├── components/
│   └── preview/
│       ├── PreviewPanel.tsx ✨ Nuevo - Panel principal
│       ├── FileExplorer.tsx ✨ Nuevo - Árbol de archivos
│       ├── CodeViewer.tsx ✨ Nuevo - Visor de código
│       ├── ChangesList.tsx ✨ Nuevo - Lista de cambios
│       └── NotificationToast.tsx ✨ Nuevo - Toasts
└── dev/
    └── page.tsx ✅ Actualizado - Layout dividido
```

## 🎨 Estilos y Colores

### Paleta (coherente con Claude.ai)
```css
--claude-beige: #f5f3ef
--claude-orange: #f97316
--claude-border: #e5e2dd

Fondos:
- Chat: gradient (orange-50/30 → amber-50/20)
- Preview tabs: claude-beige/20
- Code viewer: gray-50
- File tree: white
```

### Animaciones (framer-motion)
```typescript
// Tabs
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}

// Notificaciones
initial={{ opacity: 0, x: 100, scale: 0.8 }}
animate={{ opacity: 1, x: 0, scale: 1 }}
exit={{ opacity: 0, x: 100, scale: 0.8 }}

// File tree nodes
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}

// Changes list items
initial={{ opacity: 0, x: -20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: idx * 0.05 }}
```

## 🔧 Integración con Sistema de Archivos

### Detección Automática de Cambios

```typescript
// En page.tsx, caso tool_result:
if (event.toolName === "write_file") {
  const result = JSON.parse(event.result);
  if (result.success) {
    addFileChange({
      path: result.path,
      action: result.backupPath ? "modified" : "created",
      backupPath: result.backupPath,
      timestamp: new Date()
    });
  }
}
```

Esta integración:
- ✅ Detecta automáticamente cuando Claude escribe archivos
- ✅ Actualiza la lista de cambios
- ✅ Muestra notificación
- ✅ Permite ver el archivo inmediatamente
- ✅ Permite revertir cambios

## 📊 Tabs del Preview Panel

### 1. Tab "Preview"
```
┌─────────────────────────────┐
│ ┌──┬─────────┬─────────┬─┐  │
│ │▶ │ Preview │ Archivos│X│  │
│ └──┴─────────┴─────────┴─┘  │
│                              │
│  ┌────────────────────────┐ │
│  │                        │ │
│  │  iframe                │ │
│  │  src="localhost:3000"  │ │
│  │                        │ │
│  │  [Refresh] 🔄          │ │
│  │                        │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

### 2. Tab "Archivos"
```
┌─────────────────────────────────────┐
│ ┌──┬─────────┬─────────┬─┐          │
│ │  │ Preview │▶Archivos│X│          │
│ └──┴─────────┴─────────┴─┘          │
│                                      │
│ ┌────────────┬──────────────────┐   │
│ │ 📁 app     │ CodeViewer       │   │
│ │   📁 api   │ app/page.tsx     │   │
│ │   📄 page  │ ┌──────────────┐ │   │
│ │ 📁 lib     │ │1  "use client"│ │   │
│ │   📄 utils │ │2              │ │   │
│ │ 📄 package │ │3  export...   │ │   │
│ └────────────┴──────────────────┘   │
└─────────────────────────────────────┘
      50%              50%
```

### 3. Tab "Cambios"
```
┌──────────────────────────────┐
│ ┌──┬─────────┬────────┬─┐    │
│ │  │ Preview │▶Cambios│X│    │
│ └──┴─────────┴────────┴─┘    │
│                               │
│ Cambios en esta Sesión        │
│ 3 archivos modificados        │
│                               │
│ ┌──────────────────────────┐ │
│ │ 🆕 lib/helpers.ts        │ │
│ │    Creado - 15:30:45     │ │
│ │    [Ver] [Revertir]      │ │
│ ├──────────────────────────┤ │
│ │ ✏️  app/page.tsx         │ │
│ │    Modificado - 15:31:20 │ │
│ │    Backup: .backups/...  │ │
│ │    [Ver] [Revertir]      │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## 🎬 Capturas Conceptuales

### Estado Inicial (sin mensajes)
```
┌─────────────────────────┬─────────────────────────┐
│   Chat de Desarrollo    │   [Preview]             │
│                         │                         │
│   ¡Hola! Soy Claude     │   [iframe]              │
│   Puedo leer, escribir  │   localhost:3000        │
│   y modificar archivos  │                         │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

### Durante conversación
```
┌─────────────────────────┬─────────────────────────┐
│ User: Crea helpers.ts   │   [Archivos] (1)        │
│                         │                         │
│ Claude: He creado...    │   📁 app                │
│ _[Usando: write_file]_  │   📁 lib                │
│ _[Herramienta OK]_      │     📄 helpers.ts 🔴    │
│                         │                         │
│ ┌──────────────────┐    │   [CodeViewer]          │
│ │ Notificación:    │    │   lib/helpers.ts        │
│ │ 🆕 Archivo creado│    │   export function sum() │
│ │    helpers.ts    │    │                         │
│ └──────────────────┘    │                         │
└─────────────────────────┴─────────────────────────┘
```

## 💡 Características Destacadas

### ✨ Funcionalidades Principales

1. **Preview en Tiempo Real**
   - iframe con localhost:3000
   - Botón de refresh manual
   - Detecta cambios automáticamente

2. **Explorador de Archivos**
   - Árbol expandible/colapsable
   - Iconos por tipo de archivo
   - Resalta archivos modificados
   - Carga lazy de directorios

3. **Visor de Código**
   - Syntax highlighting básico
   - Números de línea
   - Scroll sincronizado
   - Información del archivo

4. **Historial de Cambios**
   - Lista de todos los cambios
   - Timestamps precisos
   - Capacidad de revertir
   - Info de backups

5. **Notificaciones Inteligentes**
   - Toasts automáticos
   - Click para abrir archivo
   - Auto-dismiss
   - Animaciones fluidas

6. **Panel Redimensionable**
   - Drag & drop divisor
   - Límites 30-70%
   - Transiciones suaves
   - Estado persistente

7. **Interfaz Responsive**
   - Colapsar preview
   - Panel ocupando 100% si collapsed
   - Botón para expandir

## 🚀 Cómo Usar

### Para el Usuario:

1. **Pide a Claude que modifique archivos:**
   ```
   "Crea un archivo lib/utils.ts con función formatDate"
   ```

2. **Observa la notificación:**
   - Aparece toast en bottom-right
   - Click para ver el archivo

3. **Explora en el panel derecho:**
   - Tab "Archivos": Navega el proyecto
   - Tab "Cambios": Ve el historial
   - Tab "Preview": Ve la app corriendo

4. **Redimensiona si necesitas:**
   - Arrastra el divisor vertical
   - Ajusta según tu preferencia

5. **Revierte cambios si es necesario:**
   - Tab "Cambios" → Click "Revertir"

### Para Desarrolladores:

1. **Agregar cambios al contexto:**
   ```typescript
   const { addFileChange } = useDevContext();
   addFileChange({
     path: "file.ts",
     action: "modified",
     timestamp: new Date(),
     backupPath: ".backups/..."
   });
   ```

2. **Mostrar notificaciones:**
   ```typescript
   const { addNotification } = useDevContext();
   addNotification({
     type: "file_modified",
     message: "Archivo actualizado",
     filePath: "file.ts"
   });
   ```

3. **Abrir archivo en viewer:**
   ```typescript
   const { setSelectedFile, setActivePreviewTab } = useDevContext();
   setSelectedFile({ path, content, lastModified });
   setActivePreviewTab("files");
   ```

## 📈 Próximas Mejoras Potenciales

1. **Diff Viewer**
   - Mostrar antes/después lado a lado
   - Highlighting de cambios

2. **Búsqueda de Archivos**
   - Input de búsqueda en FileExplorer
   - Fuzzy search

3. **Terminal Integrado**
   - Tab adicional con terminal
   - Ejecutar comandos npm

4. **Hot Reload Automático**
   - Detectar cambios y refrescar iframe
   - Sin click manual

5. **Themes**
   - Dark mode
   - Syntax themes personalizables

6. **Git Integration**
   - Ver diff con git
   - Crear commits desde la UI

---

**Estado:** ✅ Sistema completamente funcional
**Fecha:** 2025-11-24
**Versión:** 1.0.0
