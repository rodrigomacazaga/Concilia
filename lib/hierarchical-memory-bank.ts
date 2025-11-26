import fs from "fs/promises";
import path from "path";
import type {
  MemoryBankConfig,
  MemoryBankFile,
  ServiceSummary,
  SyncResult,
  GeneralMemoryBank,
  LocalMemoryBank,
} from "./types/memory-bank";

const WORKSPACES_DIR = path.join(process.cwd(), "workspaces");

// ============================================================================
// UTILIDADES
// ============================================================================

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readMdFiles(dirPath: string): Promise<MemoryBankFile[]> {
  try {
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    const result: MemoryBankFile[] = [];
    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, "utf-8");

      result.push({
        name: file,
        path: filePath,
        content,
        lastModified: stats.mtime.toISOString(),
        size: stats.size,
      });
    }

    return result;
  } catch {
    return [];
  }
}

function countEndpoints(content: string): number {
  const matches = content.match(/^-\s*(GET|POST|PUT|PATCH|DELETE)\s+/gm);
  return matches?.length || 0;
}

function countTables(content: string): number {
  const matches = content.match(/^##\s+\w+|CREATE TABLE/gm);
  return matches?.length || 0;
}

// ============================================================================
// MEMORY BANK GENERAL
// ============================================================================

export async function getGeneralMemoryBank(
  projectPath: string,
  projectName: string
): Promise<GeneralMemoryBank> {
  const mbPath = path.join(projectPath, "memory-bank");

  // Siempre detectar servicios, incluso si el MB general no existe
  const services = await detectServicesWithMemoryBank(projectPath);

  if (!(await fileExists(mbPath))) {
    return {
      exists: false,
      projectName,
      projectPath,
      files: [],
      services,
    };
  }

  const files = await readMdFiles(mbPath);

  return {
    exists: true,
    projectName,
    projectPath,
    files,
    services,
  };
}

export async function detectServicesWithMemoryBank(
  projectPath: string
): Promise<ServiceSummary[]> {
  const services: ServiceSummary[] = [];

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "memory-bank") continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;

      const servicePath = path.join(projectPath, entry.name);
      const localMBPath = path.join(servicePath, "memory-bank");

      if (await fileExists(localMBPath)) {
        const configPath = path.join(localMBPath, ".sync-config.json");

        let config: MemoryBankConfig | null = null;
        if (await fileExists(configPath)) {
          const configContent = await fs.readFile(configPath, "utf-8");
          config = JSON.parse(configContent);
        }

        // Contar endpoints y tablas
        let endpointsCount = 0;
        let tablesCount = 0;

        const apiFile = path.join(localMBPath, "API-CONTRACTS.md");
        if (await fileExists(apiFile)) {
          const apiContent = await fs.readFile(apiFile, "utf-8");
          endpointsCount = countEndpoints(apiContent);
        }

        const dbFile = path.join(localMBPath, "DATABASE-SCHEMA.md");
        if (await fileExists(dbFile)) {
          const dbContent = await fs.readFile(dbFile, "utf-8");
          tablesCount = countTables(dbContent);
        }

        services.push({
          name: config?.service_name || entry.name,
          version: config?.version || "0.0.0",
          description: config?.description || "",
          port: config?.port,
          technology: config?.technology,
          endpoints_count: endpointsCount,
          tables_count: tablesCount,
          status: config?.status || "development",
          last_sync: config?.last_sync,
          has_local_memory_bank: true,
        });
      }
    }
  } catch (error) {
    console.error("Error detecting services:", error);
  }

  return services;
}

// ============================================================================
// MEMORY BANK LOCAL (SERVICIO)
// ============================================================================

export async function getLocalMemoryBank(
  projectPath: string,
  serviceName: string
): Promise<LocalMemoryBank> {
  const servicePath = path.join(projectPath, serviceName);
  const mbPath = path.join(servicePath, "memory-bank");

  if (!(await fileExists(mbPath))) {
    return {
      exists: false,
      serviceName,
      servicePath,
      config: null,
      files: [],
    };
  }

  const files = await readMdFiles(mbPath);

  // Leer config si existe
  let config: MemoryBankConfig | null = null;
  const configPath = path.join(mbPath, ".sync-config.json");
  if (await fileExists(configPath)) {
    const configContent = await fs.readFile(configPath, "utf-8");
    config = JSON.parse(configContent);
  }

  return {
    exists: true,
    serviceName,
    servicePath,
    config,
    files,
  };
}

export async function updateLocalMemoryBankFile(
  projectPath: string,
  serviceName: string,
  fileName: string,
  content: string
): Promise<{ success: boolean; path: string }> {
  const mbPath = path.join(projectPath, serviceName, "memory-bank");

  // Crear directorio si no existe
  await fs.mkdir(mbPath, { recursive: true });

  const filePath = path.join(mbPath, fileName);
  await fs.writeFile(filePath, content, "utf-8");

  // Actualizar CHANGELOG si no es el CHANGELOG mismo
  if (fileName !== "CHANGELOG.md") {
    await appendToChangelog(mbPath, fileName, "updated");
  }

  return { success: true, path: filePath };
}

async function appendToChangelog(
  mbPath: string,
  fileName: string,
  action: string
): Promise<void> {
  const changelogPath = path.join(mbPath, "CHANGELOG.md");
  const timestamp = new Date().toISOString();
  const entry = `\n- ${timestamp}: ${action} ${fileName}`;

  if (await fileExists(changelogPath)) {
    await fs.appendFile(changelogPath, entry);
  } else {
    await fs.writeFile(changelogPath, `# Changelog\n${entry}`);
  }
}

// ============================================================================
// SINCRONIZACIÓN
// ============================================================================

export async function syncLocalToGeneral(
  projectPath: string,
  serviceName: string
): Promise<SyncResult> {
  const localMBPath = path.join(projectPath, serviceName, "memory-bank");
  const generalMBPath = path.join(projectPath, "memory-bank");

  const result: SyncResult = {
    success: false,
    service: serviceName,
    filesUpdated: [],
    generalFilesUpdated: [],
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // Verificar Memory Bank local
  if (!(await fileExists(localMBPath))) {
    result.errors.push("Local Memory Bank not found");
    return result;
  }

  // Crear Memory Bank general si no existe
  await fs.mkdir(generalMBPath, { recursive: true });

  // Leer config de sync
  const configPath = path.join(localMBPath, ".sync-config.json");
  if (!(await fileExists(configPath))) {
    result.errors.push(".sync-config.json not found");
    return result;
  }

  const configContent = await fs.readFile(configPath, "utf-8");
  const config: MemoryBankConfig = JSON.parse(configContent);

  try {
    // 1. Sincronizar archivos mapeados
    for (const [localFile, generalSection] of Object.entries(
      config.sync_to_general
    )) {
      const localFilePath = path.join(localMBPath, localFile);

      if (!(await fileExists(localFilePath))) continue;

      const localContent = await fs.readFile(localFilePath, "utf-8");

      // Actualizar sección en archivo general
      const generalFilePath = path.join(generalMBPath, generalSection);
      await updateGeneralSection(
        generalFilePath,
        serviceName,
        config.version,
        localContent
      );

      result.filesUpdated.push(localFile);
      result.generalFilesUpdated.push(generalSection);
    }

    // 2. Actualizar índice de microservicios
    await updateMicroservicesIndex(generalMBPath, config);
    result.generalFilesUpdated.push("02-MICROSERVICES-INDEX.md");

    // 3. Actualizar timestamp de sync en config
    config.last_sync = result.timestamp;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    result.success = true;
  } catch (error: any) {
    result.errors.push(error.message);
  }

  return result;
}

async function updateGeneralSection(
  generalFilePath: string,
  serviceName: string,
  version: string,
  localContent: string
): Promise<void> {
  const sectionMarkerStart = `<!-- BEGIN:${serviceName} -->`;
  const sectionMarkerEnd = `<!-- END:${serviceName} -->`;

  const newSection = `
${sectionMarkerStart}
## ${serviceName} (v${version})

> Sincronizado automáticamente desde: ${serviceName}/memory-bank/
> Última actualización: ${new Date().toISOString()}

${localContent}

${sectionMarkerEnd}
`;

  let generalContent = "";

  if (await fileExists(generalFilePath)) {
    generalContent = await fs.readFile(generalFilePath, "utf-8");

    const regex = new RegExp(
      `${sectionMarkerStart}[\\s\\S]*?${sectionMarkerEnd}`,
      "g"
    );

    if (generalContent.match(regex)) {
      generalContent = generalContent.replace(regex, newSection.trim());
    } else {
      generalContent += "\n" + newSection;
    }
  } else {
    const fileName = path.basename(generalFilePath);
    generalContent = `# ${fileName.replace(".md", "").replace(/-/g, " ")}\n\n${newSection}`;
  }

  await fs.writeFile(generalFilePath, generalContent);
}

async function updateMicroservicesIndex(
  generalMBPath: string,
  config: MemoryBankConfig
): Promise<void> {
  const indexPath = path.join(generalMBPath, "02-MICROSERVICES-INDEX.md");

  let indexContent: string;
  if (await fileExists(indexPath)) {
    indexContent = await fs.readFile(indexPath, "utf-8");
  } else {
    indexContent = `# Microservices Index

> Auto-generado por Memory Bank Sync
> Última actualización: ${new Date().toISOString()}

## Servicios

| Servicio | Versión | Puerto | Tecnología | Estado | Última Sync |
|----------|---------|--------|------------|--------|-------------|
`;
  }

  const rowRegex = new RegExp(`\\| ${config.service_name} \\|[^\\n]+\\n`, "g");
  const statusEmoji =
    config.status === "active"
      ? "🟢"
      : config.status === "development"
        ? "🟡"
        : config.status === "deprecated"
          ? "🔴"
          : "⚪";
  const newRow = `| ${config.service_name} | ${config.version} | ${config.port || "N/A"} | ${config.technology || "N/A"} | ${statusEmoji} ${config.status || "development"} | ${new Date().toISOString().split("T")[0]} |\n`;

  if (indexContent.match(rowRegex)) {
    indexContent = indexContent.replace(rowRegex, newRow);
  } else {
    indexContent = indexContent.trimEnd() + "\n" + newRow;
  }

  // Actualizar timestamp del índice
  indexContent = indexContent.replace(
    /> Última actualización:.*\n/,
    `> Última actualización: ${new Date().toISOString()}\n`
  );

  await fs.writeFile(indexPath, indexContent);
}

export async function syncAllServices(projectPath: string): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "memory-bank") continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;

      const localMBPath = path.join(projectPath, entry.name, "memory-bank");

      if (await fileExists(localMBPath)) {
        const result = await syncLocalToGeneral(projectPath, entry.name);
        results.push(result);
      }
    }
  } catch (error) {
    console.error("Error syncing all services:", error);
  }

  return results;
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

export async function initGeneralMemoryBank(
  projectPath: string,
  projectName: string
): Promise<{ success: boolean; path: string; filesCreated: string[] }> {
  const mbPath = path.join(projectPath, "memory-bank");

  if (await fileExists(mbPath)) {
    throw new Error("Memory Bank already exists");
  }

  await fs.mkdir(mbPath, { recursive: true });

  const timestamp = new Date().toISOString();
  const files: Record<string, string> = {
    "META-MEMORY-BANK.md": `# META: Memory Bank Maintenance

## Reglas para la IA

1. **Memory Bank es la fuente de verdad**
2. **Actualizar Memory Bank ANTES de código**
3. **Cada servicio tiene su propio Memory Bank local**
4. **Los cambios locales se sincronizan al general automáticamente**

## Estructura

\`\`\`
memory-bank/                    ← GENERAL (este directorio)
├── META-MEMORY-BANK.md
├── 00-PROJECT-OVERVIEW.md
├── 01-ARCHITECTURE.md
├── 02-MICROSERVICES-INDEX.md   ← Auto-generado
├── 03-API-CONTRACTS-GLOBAL.md  ← Consolidado de servicios
└── 04-DATABASE-SCHEMA-GLOBAL.md

servicio-x/
└── memory-bank/                ← LOCAL
    ├── .sync-config.json       ← Config de sincronización
    ├── META.md
    ├── API-CONTRACTS.md
    ├── DATABASE-SCHEMA.md
    └── CHANGELOG.md
\`\`\`

## Sincronización

Los Memory Banks locales se sincronizan automáticamente al general.
Cada servicio define en \`.sync-config.json\` qué archivos sincronizar.

---

**Proyecto**: ${projectName}
**Creado**: ${timestamp}
`,

    "00-PROJECT-OVERVIEW.md": `# ${projectName}

## Descripción

[Descripción del proyecto]

## Stack Tecnológico

- Frontend: [tecnología]
- Backend: [tecnología]
- Base de datos: [tecnología]

## Estructura de Servicios

Ver \`02-MICROSERVICES-INDEX.md\` para la lista completa de servicios.

---

**Última actualización**: ${timestamp}
`,

    "01-ARCHITECTURE.md": `# Arquitectura

## Diagrama General

\`\`\`
[Cliente] → [API Gateway] → [Servicios]
                              ├── servicio-a
                              ├── servicio-b
                              └── servicio-c
\`\`\`

## Decisiones Arquitectónicas

1. **Microservicios**: Cada módulo es un servicio independiente
2. **Docker**: Cada servicio corre en su propio container
3. **Memory Bank Jerárquico**: Documentación distribuida con sincronización

---

**Última actualización**: ${timestamp}
`,

    "02-MICROSERVICES-INDEX.md": `# Microservices Index

> Auto-generado por Memory Bank Sync
> Última actualización: ${timestamp}

## Servicios

| Servicio | Versión | Puerto | Tecnología | Estado | Última Sync |
|----------|---------|--------|------------|--------|-------------|

---

*Este archivo se actualiza automáticamente cuando se sincronizan los Memory Banks locales.*
`,
  };

  for (const [fileName, content] of Object.entries(files)) {
    await fs.writeFile(path.join(mbPath, fileName), content);
  }

  return {
    success: true,
    path: mbPath,
    filesCreated: Object.keys(files),
  };
}

export async function initLocalMemoryBank(
  projectPath: string,
  serviceName: string,
  customConfig?: Partial<MemoryBankConfig>
): Promise<{
  success: boolean;
  path: string;
  config: MemoryBankConfig;
  filesCreated: string[];
}> {
  const servicePath = path.join(projectPath, serviceName);
  const mbPath = path.join(servicePath, "memory-bank");

  // Crear directorio del servicio si no existe
  await fs.mkdir(servicePath, { recursive: true });

  if (await fileExists(mbPath)) {
    throw new Error("Local Memory Bank already exists");
  }

  await fs.mkdir(mbPath, { recursive: true });

  const timestamp = new Date().toISOString();
  const config: MemoryBankConfig = {
    service_name: serviceName,
    version: "0.1.0",
    description: customConfig?.description || `Servicio ${serviceName}`,
    port: customConfig?.port || 5000 + Math.floor(Math.random() * 1000),
    technology: customConfig?.technology || "node",
    sync_to_general: {
      "API-CONTRACTS.md": "03-API-CONTRACTS-GLOBAL.md",
      "DATABASE-SCHEMA.md": "04-DATABASE-SCHEMA-GLOBAL.md",
    },
    dependencies: [],
    auto_sync: true,
    status: "development",
    ...customConfig,
  };

  const files: Record<string, string> = {
    ".sync-config.json": JSON.stringify(config, null, 2),

    "META.md": `# ${serviceName}

## Descripción

${config.description}

## Información

- **Puerto**: ${config.port}
- **Tecnología**: ${config.technology}
- **Versión**: ${config.version}

## Responsabilidades

- [Responsabilidad 1]
- [Responsabilidad 2]

---

**Creado**: ${timestamp}
`,

    "API-CONTRACTS.md": `# API Contracts - ${serviceName}

## Base URL

\`http://localhost:${config.port}\`

## Endpoints

### Health Check

- GET /health
  - Response: \`{ "status": "ok" }\`

---

*Agregar endpoints aquí*
`,

    "DATABASE-SCHEMA.md": `# Database Schema - ${serviceName}

## Tablas

*Agregar tablas aquí*

---

**Nota**: Este servicio usa [PostgreSQL/MongoDB/Redis/etc.]
`,

    "BUSINESS-LOGIC.md": `# Business Logic - ${serviceName}

## Reglas de Negocio

*Documentar reglas de negocio aquí*

---
`,

    "DEPENDENCIES.md": `# Dependencies - ${serviceName}

## Servicios que Consumo

*Ninguno por ahora*

## Servicios que me Consumen

*Ninguno por ahora*

---
`,

    "CHANGELOG.md": `# Changelog - ${serviceName}

## [${config.version}] - ${timestamp.split("T")[0]}

### Added
- Inicialización del servicio
- Memory Bank local creado

---
`,
  };

  for (const [fileName, content] of Object.entries(files)) {
    await fs.writeFile(path.join(mbPath, fileName), content);
  }

  return {
    success: true,
    path: mbPath,
    config,
    filesCreated: Object.keys(files),
  };
}

// ============================================================================
// CONTEXTO PARA CLAUDE
// ============================================================================

export async function buildMemoryBankContext(
  projectPath: string,
  projectName: string,
  currentService?: string
): Promise<string> {
  let context = "";

  // 1. Cargar Memory Bank General
  const generalMB = await getGeneralMemoryBank(projectPath, projectName);

  if (generalMB.exists) {
    context += `\n=== MEMORY BANK GENERAL ===\n\n`;

    // Incluir META primero
    const meta = generalMB.files.find((f) => f.name === "META-MEMORY-BANK.md");
    if (meta) {
      context += meta.content + "\n\n";
    }

    // Incluir otros archivos del general (resumidos)
    for (const file of generalMB.files) {
      if (file.name !== "META-MEMORY-BANK.md") {
        context += `### ${file.name}\n\n`;
        const lines = file.content.split("\n").slice(0, 50);
        context += lines.join("\n");
        if (file.content.split("\n").length > 50) {
          context +=
            "\n\n[... contenido truncado, pedir archivo completo si necesario ...]\n";
        }
        context += "\n\n";
      }
    }

    // Lista de servicios disponibles
    if (generalMB.services.length > 0) {
      context += `### Servicios Disponibles\n\n`;
      for (const svc of generalMB.services) {
        context += `- **${svc.name}** (v${svc.version}): Puerto ${svc.port || "N/A"}, ${svc.endpoints_count} endpoints\n`;
      }
      context += "\n";
    }
  }

  // 2. Si hay servicio actual, cargar su Memory Bank Local
  if (currentService) {
    const localMB = await getLocalMemoryBank(projectPath, currentService);

    if (localMB.exists) {
      context += `\n=== MEMORY BANK LOCAL: ${currentService} ===\n\n`;

      for (const file of localMB.files) {
        context += `### ${file.name}\n\n`;
        context += file.content;
        context += "\n\n";
      }

      if (localMB.config) {
        context += `### Configuración del Servicio\n\n`;
        context += `- Versión: ${localMB.config.version}\n`;
        context += `- Puerto: ${localMB.config.port}\n`;
        context += `- Tecnología: ${localMB.config.technology}\n`;
        context += `- Auto-sync: ${localMB.config.auto_sync}\n`;
        context += "\n";
      }
    }
  }

  context += `
=== FIN MEMORY BANK ===

INSTRUCCIONES:
1. Si modificas código de "${currentService || "cualquier servicio"}", actualiza su Memory Bank local
2. Usa POST /api/memory-bank/[servicio] para actualizar archivos
3. El sync al Memory Bank general es automático
4. Siempre verifica que el código coincida con las especificaciones del Memory Bank
`;

  return context;
}
