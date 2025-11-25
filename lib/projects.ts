import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const WORKSPACES_DIR = path.join(process.cwd(), "workspaces");

export interface Project {
  id: string;
  name: string;
  path: string;
  gitUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  memoryBankPath?: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  hasChanges: boolean;
}

// Asegurar directorios
async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(WORKSPACES_DIR, { recursive: true });
}

// Cargar proyectos
async function loadProjects(): Promise<Project[]> {
  await ensureDirectories();
  try {
    const content = await fs.readFile(PROJECTS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Guardar proyectos
async function saveProjects(projects: Project[]): Promise<void> {
  await ensureDirectories();
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

// Listar todos los proyectos
export async function listProjects(): Promise<Project[]> {
  return loadProjects();
}

// Obtener un proyecto por ID
export async function getProject(id: string): Promise<Project | null> {
  const projects = await loadProjects();
  return projects.find((p) => p.id === id) || null;
}

// Crear un nuevo proyecto
export async function createProject(data: {
  name: string;
  path?: string;
  gitUrl?: string;
  description?: string;
}): Promise<Project> {
  const projects = await loadProjects();

  const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  let projectPath = data.path;

  // Si hay gitUrl pero no path, clonar en workspaces
  if (data.gitUrl && !projectPath) {
    projectPath = path.join(WORKSPACES_DIR, data.name);

    // Clonar repositorio
    try {
      await execAsync(`git clone ${data.gitUrl} "${projectPath}"`);
    } catch (error: any) {
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  // Verificar que el path existe
  if (projectPath) {
    try {
      await fs.access(projectPath);
    } catch {
      throw new Error(`Path does not exist: ${projectPath}`);
    }
  }

  // Buscar Memory Bank en el proyecto
  let memoryBankPath: string | undefined;
  if (projectPath) {
    const mbPath = path.join(projectPath, "memory-bank");
    try {
      await fs.access(mbPath);
      memoryBankPath = mbPath;
    } catch {
      // No memory bank found
    }
  }

  const project: Project = {
    id,
    name: data.name,
    path: projectPath || "",
    gitUrl: data.gitUrl,
    description: data.description,
    createdAt: now,
    updatedAt: now,
    memoryBankPath,
  };

  projects.push(project);
  await saveProjects(projects);

  return project;
}

// Actualizar un proyecto
export async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
  const projects = await loadProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  projects[index] = {
    ...projects[index],
    ...data,
    id, // No permitir cambiar el ID
    updatedAt: new Date().toISOString(),
  };

  await saveProjects(projects);
  return projects[index];
}

// Eliminar un proyecto
export async function deleteProject(id: string, deleteFiles: boolean = false): Promise<boolean> {
  const projects = await loadProjects();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return false;
  }

  // Opcionalmente eliminar archivos
  if (deleteFiles && project.path && project.path.startsWith(WORKSPACES_DIR)) {
    try {
      await fs.rm(project.path, { recursive: true, force: true });
    } catch (error) {
      console.error("Error deleting project files:", error);
    }
  }

  const filtered = projects.filter((p) => p.id !== id);
  await saveProjects(filtered);

  return true;
}

// Obtener estado de Git de un proyecto
export async function getGitStatus(projectPath: string): Promise<GitStatus | null> {
  try {
    // Verificar si es un repo git
    await execAsync(`git -C "${projectPath}" rev-parse --git-dir`);

    // Obtener branch actual
    const { stdout: branchOut } = await execAsync(`git -C "${projectPath}" branch --show-current`);
    const branch = branchOut.trim();

    // Obtener ahead/behind
    let ahead = 0;
    let behind = 0;
    try {
      const { stdout: aheadBehind } = await execAsync(
        `git -C "${projectPath}" rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo "0 0"`
      );
      const parts = aheadBehind.trim().split(/\s+/);
      ahead = parseInt(parts[0]) || 0;
      behind = parseInt(parts[1]) || 0;
    } catch {
      // No upstream configured
    }

    // Obtener archivos staged
    const { stdout: stagedOut } = await execAsync(
      `git -C "${projectPath}" diff --cached --name-only`
    );
    const staged = stagedOut.trim().split("\n").filter(Boolean);

    // Obtener archivos unstaged
    const { stdout: unstagedOut } = await execAsync(
      `git -C "${projectPath}" diff --name-only`
    );
    const unstaged = unstagedOut.trim().split("\n").filter(Boolean);

    // Obtener archivos untracked
    const { stdout: untrackedOut } = await execAsync(
      `git -C "${projectPath}" ls-files --others --exclude-standard`
    );
    const untracked = untrackedOut.trim().split("\n").filter(Boolean);

    return {
      branch,
      ahead,
      behind,
      staged,
      unstaged,
      untracked,
      hasChanges: staged.length > 0 || unstaged.length > 0 || untracked.length > 0,
    };
  } catch {
    return null;
  }
}

// Ejecutar comando git en un proyecto
export async function runGitCommand(
  projectPath: string,
  command: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  // Lista de comandos permitidos
  const allowedCommands = [
    "status",
    "log",
    "diff",
    "branch",
    "checkout",
    "pull",
    "push",
    "fetch",
    "add",
    "commit",
    "stash",
    "merge",
    "rebase",
    "reset",
    "remote",
    "show",
  ];

  const commandParts = command.trim().split(/\s+/);
  const gitCommand = commandParts[0];

  if (!allowedCommands.includes(gitCommand)) {
    return {
      success: false,
      stdout: "",
      stderr: `Command '${gitCommand}' is not allowed. Allowed commands: ${allowedCommands.join(", ")}`,
    };
  }

  try {
    const { stdout, stderr } = await execAsync(`git -C "${projectPath}" ${command}`);
    return { success: true, stdout, stderr };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
    };
  }
}

// Cargar Memory Bank de un proyecto
export async function loadProjectMemoryBank(projectPath: string): Promise<string | null> {
  const mbPath = path.join(projectPath, "memory-bank");

  try {
    await fs.access(mbPath);

    const files = await fs.readdir(mbPath);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    let consolidated = "";

    for (const file of mdFiles) {
      const filePath = path.join(mbPath, file);
      const content = await fs.readFile(filePath, "utf-8");
      consolidated += `\n\n## ${file}\n\n${content}`;
    }

    return consolidated.trim();
  } catch {
    return null;
  }
}
