/**
 * Utilidades de seguridad para operaciones de archivos
 * Previene accesos fuera del proyecto y a archivos sensibles
 */

import path from "path";
import fs from "fs/promises";

// Directorio raíz del proyecto (resuelto en tiempo de ejecución)
const PROJECT_ROOT = process.cwd();

// Archivos y directorios prohibidos
const FORBIDDEN_PATHS = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "node_modules",
  ".git",
  ".next",
];

// Extensiones de archivos sensibles que no se pueden modificar
const FORBIDDEN_EXTENSIONS = [".key", ".pem", ".cert"];

/**
 * Valida y resuelve una ruta de archivo de forma segura
 * @param userPath - Ruta proporcionada por el usuario
 * @returns Ruta absoluta validada
 * @throws Error si la ruta es insegura
 */
export function validatePath(userPath: string): string {
  // Normalizar la ruta
  const normalizedPath = path.normalize(userPath);

  // Resolver la ruta absoluta
  const absolutePath = path.resolve(PROJECT_ROOT, normalizedPath);

  // SEGURIDAD: Verificar que la ruta esté dentro del proyecto
  if (!absolutePath.startsWith(PROJECT_ROOT)) {
    throw new Error("Acceso denegado: La ruta está fuera del proyecto");
  }

  // Verificar archivos/directorios prohibidos
  const relativePath = path.relative(PROJECT_ROOT, absolutePath);
  const pathParts = relativePath.split(path.sep);

  for (const forbidden of FORBIDDEN_PATHS) {
    if (pathParts.includes(forbidden) || relativePath === forbidden) {
      throw new Error(`Acceso denegado: No se permite acceder a '${forbidden}'`);
    }
  }

  // Verificar extensiones prohibidas
  const ext = path.extname(absolutePath);
  if (FORBIDDEN_EXTENSIONS.includes(ext)) {
    throw new Error(`Acceso denegado: No se permiten archivos ${ext}`);
  }

  return absolutePath;
}

/**
 * Crea un backup de un archivo antes de modificarlo
 * @param filePath - Ruta absoluta del archivo
 * @returns Ruta del archivo de backup creado
 */
export async function createBackup(filePath: string): Promise<string> {
  const backupDir = path.join(PROJECT_ROOT, ".backups");

  // Crear directorio de backups si no existe
  await fs.mkdir(backupDir, { recursive: true });

  // Generar nombre de backup con timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const backupFileName = `${relativePath.replace(/\//g, "_")}_${timestamp}`;
  const backupPath = path.join(backupDir, backupFileName);

  try {
    // Copiar archivo original al backup
    const content = await fs.readFile(filePath, "utf-8");
    await fs.writeFile(backupPath, content, "utf-8");
    console.log(`[backup] Backup creado: ${backupPath}`);
    return backupPath;
  } catch (error: any) {
    // Si el archivo no existe, no hay nada que respaldar
    if (error.code === "ENOENT") {
      console.log(`[backup] No se creó backup: archivo no existe`);
      return "";
    }
    throw error;
  }
}

/**
 * Verifica si un archivo existe
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene información sobre si una ruta es archivo o directorio
 */
export async function getPathType(
  absolutePath: string
): Promise<"file" | "directory" | null> {
  try {
    const stats = await fs.stat(absolutePath);
    if (stats.isFile()) return "file";
    if (stats.isDirectory()) return "directory";
    return null;
  } catch {
    return null;
  }
}

/**
 * Obtiene la ruta relativa desde la raíz del proyecto
 */
export function getRelativePath(absolutePath: string): string {
  return path.relative(PROJECT_ROOT, absolutePath);
}

export { PROJECT_ROOT };
