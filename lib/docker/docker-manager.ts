// Gestión de Docker para servicios

import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  DOCKERFILE_TEMPLATES,
  DOCKER_COMPOSE_SERVICE_TEMPLATE,
  DOCKER_COMPOSE_LOCAL_TEMPLATE,
  MASTER_DOCKER_COMPOSE_TEMPLATE,
  PACKAGE_JSON_TEMPLATE,
  TSCONFIG_TEMPLATE,
  REQUIREMENTS_TXT_TEMPLATE,
  MAIN_TS_TEMPLATE,
  MAIN_PY_TEMPLATE,
  DOCKERIGNORE_TEMPLATE,
} from "./service-templates";

const execAsync = promisify(exec);

export type Technology = "node" | "python" | "go" | "java" | "rust" | "dotnet";

export interface CreateServiceOptions {
  projectPath: string;
  projectName: string;
  serviceName: string;
  port: number;
  technology: Technology;
  description?: string;
  autoStart?: boolean;
}

export interface DockerServiceStatus {
  name: string;
  status: "running" | "stopped" | "not_built" | "error";
  port?: number;
  containerId?: string;
  health?: string;
}

export interface DockerResult {
  success: boolean;
  output?: string;
  error?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function replaceTemplateVars(
  template: string,
  vars: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  }
  return result;
}

// ============================================================================
// CREAR SERVICIO CON DOCKER
// ============================================================================

export async function createServiceWithDocker(
  options: CreateServiceOptions
): Promise<{ success: boolean; files: string[]; errors: string[] }> {
  const {
    projectPath,
    projectName,
    serviceName,
    port,
    technology,
    description = "",
    autoStart = false,
  } = options;

  const servicePath = path.join(projectPath, serviceName);
  const files: string[] = [];
  const errors: string[] = [];

  const vars = {
    SERVICE_NAME: serviceName,
    PROJECT_NAME: projectName,
    PORT: port,
    DESCRIPTION: description,
  };

  try {
    // 1. Crear estructura de carpetas
    await fs.mkdir(path.join(servicePath, "src"), { recursive: true });

    // 2. Crear Dockerfile
    const dockerfileTemplate = DOCKERFILE_TEMPLATES[technology] || DOCKERFILE_TEMPLATES.node;
    const dockerfile = replaceTemplateVars(dockerfileTemplate, vars);
    await fs.writeFile(path.join(servicePath, "Dockerfile"), dockerfile);
    files.push("Dockerfile");

    // 3. Crear docker-compose.local.yml
    const composeLocal = replaceTemplateVars(DOCKER_COMPOSE_LOCAL_TEMPLATE, vars);
    await fs.writeFile(path.join(servicePath, "docker-compose.local.yml"), composeLocal);
    files.push("docker-compose.local.yml");

    // 4. Crear .dockerignore
    await fs.writeFile(path.join(servicePath, ".dockerignore"), DOCKERIGNORE_TEMPLATE);
    files.push(".dockerignore");

    // 5. Crear archivos según tecnología
    if (technology === "node") {
      // package.json
      const packageJson = replaceTemplateVars(PACKAGE_JSON_TEMPLATE, vars);
      await fs.writeFile(path.join(servicePath, "package.json"), packageJson);
      files.push("package.json");

      // tsconfig.json
      await fs.writeFile(path.join(servicePath, "tsconfig.json"), TSCONFIG_TEMPLATE);
      files.push("tsconfig.json");

      // src/main.ts
      const mainTs = replaceTemplateVars(MAIN_TS_TEMPLATE, vars);
      await fs.writeFile(path.join(servicePath, "src", "main.ts"), mainTs);
      files.push("src/main.ts");

    } else if (technology === "python") {
      // requirements.txt
      await fs.writeFile(path.join(servicePath, "requirements.txt"), REQUIREMENTS_TXT_TEMPLATE);
      files.push("requirements.txt");

      // src/__init__.py
      await fs.writeFile(path.join(servicePath, "src", "__init__.py"), "");
      files.push("src/__init__.py");

      // src/main.py
      const mainPy = replaceTemplateVars(MAIN_PY_TEMPLATE, vars);
      await fs.writeFile(path.join(servicePath, "src", "main.py"), mainPy);
      files.push("src/main.py");
    }

    // 6. Actualizar docker-compose.yml MAESTRO
    await updateMasterDockerCompose(projectPath, projectName, serviceName, port);
    files.push("../docker-compose.yml");

    // 7. Opcionalmente iniciar el container
    if (autoStart) {
      const startResult = await startService(servicePath, serviceName);
      if (!startResult.success) {
        errors.push(`Auto-start failed: ${startResult.error}`);
      }
    }

    return { success: true, files, errors };

  } catch (error: any) {
    errors.push(error.message);
    return { success: false, files, errors };
  }
}

async function updateMasterDockerCompose(
  projectPath: string,
  projectName: string,
  serviceName: string,
  port: number
): Promise<void> {
  const composePath = path.join(projectPath, "docker-compose.yml");
  const vars = {
    SERVICE_NAME: serviceName,
    PROJECT_NAME: projectName,
    PORT: port,
  };

  const newService = replaceTemplateVars(DOCKER_COMPOSE_SERVICE_TEMPLATE, vars);

  if (await fileExists(composePath)) {
    let content = await fs.readFile(composePath, "utf-8");

    // Verificar si el servicio ya existe
    if (content.includes(`${serviceName}:`)) {
      console.log(`Service ${serviceName} already exists in docker-compose.yml`);
      return;
    }

    // Buscar la sección 'networks:' para insertar antes
    const networksIndex = content.indexOf("\nnetworks:");
    const volumesIndex = content.indexOf("\nvolumes:");

    let insertIndex = content.length;
    if (networksIndex !== -1) insertIndex = networksIndex;
    if (volumesIndex !== -1 && volumesIndex < insertIndex) insertIndex = volumesIndex;

    // Si no encuentra networks ni volumes, buscar el final de services
    if (insertIndex === content.length) {
      // Insertar al final
      content = content.trimEnd() + "\n" + newService + "\n";
    } else {
      content = content.slice(0, insertIndex) + newService + content.slice(insertIndex);
    }

    await fs.writeFile(composePath, content);

  } else {
    // Crear docker-compose.yml nuevo
    const masterCompose = replaceTemplateVars(MASTER_DOCKER_COMPOSE_TEMPLATE, {
      PROJECT_NAME: projectName,
    });

    // Insertar el servicio después de "services:"
    const servicesIndex = masterCompose.indexOf("services:");
    const afterServices = masterCompose.indexOf("\n", servicesIndex) + 1;

    const finalContent =
      masterCompose.slice(0, afterServices) +
      newService +
      masterCompose.slice(afterServices);

    await fs.writeFile(composePath, finalContent);
  }
}

// ============================================================================
// CONTROL DE DOCKER
// ============================================================================

export async function startService(
  servicePath: string,
  serviceName: string
): Promise<DockerResult> {
  try {
    const { stdout, stderr } = await execAsync(
      "docker-compose -f docker-compose.local.yml up -d",
      { cwd: servicePath }
    );
    return { success: true, output: stdout || stderr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function stopService(
  servicePath: string,
  serviceName: string
): Promise<DockerResult> {
  try {
    const { stdout, stderr } = await execAsync(
      "docker-compose -f docker-compose.local.yml down",
      { cwd: servicePath }
    );
    return { success: true, output: stdout || stderr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function buildService(
  servicePath: string,
  serviceName: string
): Promise<DockerResult> {
  try {
    const { stdout, stderr } = await execAsync(
      "docker-compose -f docker-compose.local.yml build --no-cache",
      { cwd: servicePath }
    );
    return { success: true, output: stdout || stderr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getServiceLogs(
  servicePath: string,
  serviceName: string,
  lines: number = 100
): Promise<{ success: boolean; logs?: string; error?: string }> {
  try {
    const { stdout } = await execAsync(
      `docker-compose -f docker-compose.local.yml logs --tail=${lines}`,
      { cwd: servicePath }
    );
    return { success: true, logs: stdout };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getServiceStatus(
  servicePath: string,
  serviceName: string
): Promise<DockerServiceStatus> {
  try {
    // Verificar si existe docker-compose.local.yml
    const composeFile = path.join(servicePath, "docker-compose.local.yml");
    if (!(await fileExists(composeFile))) {
      return { name: serviceName, status: "not_built" };
    }

    const { stdout } = await execAsync(
      "docker-compose -f docker-compose.local.yml ps --format json",
      { cwd: servicePath }
    );

    if (!stdout.trim()) {
      return { name: serviceName, status: "stopped" };
    }

    // Parsear el JSON (puede ser múltiples líneas)
    const lines = stdout.trim().split("\n").filter(Boolean);
    const containers = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const container = containers[0];

    if (!container) {
      return { name: serviceName, status: "stopped" };
    }

    return {
      name: serviceName,
      status: container.State === "running" ? "running" : "stopped",
      containerId: container.ID,
      health: container.Health,
    };

  } catch (error: any) {
    // Si docker-compose falla, asumir que no está corriendo
    return { name: serviceName, status: "stopped" };
  }
}

export async function getAllServicesStatus(
  projectPath: string
): Promise<DockerServiceStatus[]> {
  const statuses: DockerServiceStatus[] = [];

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      if (entry.name === "memory-bank") continue;

      const servicePath = path.join(projectPath, entry.name);
      const composeLocalPath = path.join(servicePath, "docker-compose.local.yml");

      if (await fileExists(composeLocalPath)) {
        const status = await getServiceStatus(servicePath, entry.name);

        // Obtener puerto de la config del memory-bank
        const configPath = path.join(servicePath, "memory-bank", ".sync-config.json");
        if (await fileExists(configPath)) {
          try {
            const configContent = await fs.readFile(configPath, "utf-8");
            const config = JSON.parse(configContent);
            status.port = config.port;
          } catch {
            // Ignorar errores de parsing
          }
        }

        statuses.push(status);
      }
    }
  } catch (error) {
    console.error("Error getting all services status:", error);
  }

  return statuses;
}

export async function restartService(
  servicePath: string,
  serviceName: string
): Promise<DockerResult> {
  try {
    const { stdout, stderr } = await execAsync(
      "docker-compose -f docker-compose.local.yml restart",
      { cwd: servicePath }
    );
    return { success: true, output: stdout || stderr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
