/**
 * Context Loader para Modos
 *
 * Carga Memory Bank y codigo segun el nivel requerido por cada modo
 */

import fs from 'fs';
import path from 'path';
import {
  Mode,
  ModeContext,
  ModeConfig,
  MODE_CONFIGS,
  MemoryBankContent,
  CodeContext
} from './types';
import { getSystemPromptForMode } from './system-prompts';

/**
 * Carga el contexto completo para un modo especifico
 */
export async function loadModeContext(
  mode: Mode,
  projectPath: string,
  projectName: string,
  serviceName: string | null,
  selectedModel?: string
): Promise<ModeContext> {
  const config = MODE_CONFIGS[mode];

  // 1. Cargar Memory Bank segun nivel
  const memoryBank = await loadMemoryBankForMode(
    projectPath,
    serviceName,
    config.memoryBankLevel
  );

  // 2. Cargar codigo segun nivel
  const codeContext = await loadCodeForMode(
    projectPath,
    serviceName,
    config.codeAccess
  );

  // 3. Formatear contextos para el prompt
  const mbGeneralFormatted = formatMemoryBank(memoryBank.general, config.memoryBankLevel);
  const mbLocalFormatted = formatMemoryBank(memoryBank.local, config.memoryBankLevel);
  const codeFormatted = formatCodeContext(codeContext, config.codeAccess);

  // 4. Generar system prompt
  const systemPrompt = getSystemPromptForMode(
    mode,
    projectName,
    serviceName,
    mbGeneralFormatted,
    mbLocalFormatted,
    codeFormatted
  );

  // 5. Estimar tokens
  const estimatedTokens = estimateTokens(systemPrompt);

  // 6. Override del modelo si se especifica
  const finalConfig = selectedModel
    ? { ...config, defaultModel: selectedModel }
    : config;

  return {
    mode,
    config: finalConfig,
    systemPrompt,
    memoryBank,
    codeContext,
    estimatedTokens
  };
}

// ============================================
// MEMORY BANK LOADING
// ============================================

async function loadMemoryBankForMode(
  projectPath: string,
  serviceName: string | null,
  level: 'summary' | 'relevant' | 'full'
): Promise<{ general: MemoryBankContent | null; local: MemoryBankContent | null }> {

  const generalPath = path.join(projectPath, 'memory-bank');
  const localPath = serviceName
    ? path.join(projectPath, serviceName, 'memory-bank')
    : null;

  return {
    general: await loadMemoryBankContent(generalPath, level),
    local: localPath ? await loadMemoryBankContent(localPath, level) : null
  };
}

async function loadMemoryBankContent(
  mbPath: string,
  level: 'summary' | 'relevant' | 'full'
): Promise<MemoryBankContent | null> {

  if (!fs.existsSync(mbPath)) {
    return null;
  }

  let files: string[];
  try {
    files = fs.readdirSync(mbPath)
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => {
        // Priorizar META y archivos importantes
        if (a.startsWith('META')) return -1;
        if (b.startsWith('META')) return 1;
        if (a.includes('progress')) return -1;
        if (b.includes('progress')) return 1;
        return a.localeCompare(b);
      });
  } catch {
    return null;
  }

  const content: MemoryBankContent = {
    files: [],
    totalSize: 0
  };

  for (const file of files) {
    const filePath = path.join(mbPath, file);
    let fileContent: string;

    try {
      fileContent = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const fileSize = fileContent.length;
    content.totalSize += fileSize;

    switch (level) {
      case 'summary':
        // Solo primeras 30 lineas de cada archivo
        const summaryLines = fileContent.split('\n').slice(0, 30);
        const truncated = fileContent.split('\n').length > 30;
        content.files.push({
          name: file,
          content: summaryLines.join('\n') + (truncated ? '\n\n[... contenido truncado ...]' : ''),
          truncated
        });
        break;

      case 'relevant':
        // Archivos completos pero con limite de tamano
        const maxSize = 5000; // caracteres por archivo
        if (fileSize > maxSize) {
          content.files.push({
            name: file,
            content: fileContent.slice(0, maxSize) + '\n\n[... truncado, archivo muy largo ...]',
            truncated: true
          });
        } else {
          content.files.push({
            name: file,
            content: fileContent,
            truncated: false
          });
        }
        break;

      case 'full':
        // Incluir todo sin truncar
        content.files.push({
          name: file,
          content: fileContent,
          truncated: false
        });
        break;
    }
  }

  // Generar resumen si es modo summary
  if (level === 'summary') {
    content.summary = generateMemoryBankSummary(content);
  }

  return content;
}

function generateMemoryBankSummary(mb: MemoryBankContent): string {
  const fileList = mb.files.map(f => `- ${f.name}`).join('\n');
  return `Archivos en Memory Bank:\n${fileList}\n\nTotal: ${mb.files.length} archivos, ${Math.round(mb.totalSize / 1024)}KB`;
}

// ============================================
// CODE LOADING
// ============================================

async function loadCodeForMode(
  projectPath: string,
  serviceName: string | null,
  level: 'read' | 'relevant' | 'full'
): Promise<CodeContext | null> {

  const targetPath = serviceName
    ? path.join(projectPath, serviceName)
    : projectPath;

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  const codeContext: CodeContext = {
    files: [],
    structure: '',
    dependencies: []
  };

  // Generar estructura de directorios
  codeContext.structure = generateDirectoryTree(targetPath, 3);

  // Cargar dependencias si existe package.json o requirements.txt
  codeContext.dependencies = await loadDependencies(targetPath);

  // Determinar cantidad de archivos segun nivel
  const maxFiles = level === 'full' ? 50 : level === 'relevant' ? 20 : 10;
  const maxFileSize = level === 'full' ? 10000 : level === 'relevant' ? 3000 : 2000;

  // Cargar archivos de codigo
  const codeFiles = findCodeFiles(targetPath, maxFiles);

  for (const filePath of codeFiles) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const relativePath = path.relative(targetPath, filePath);
    const language = getLanguageFromExtension(path.extname(filePath));

    codeContext.files.push({
      path: relativePath,
      content: content.length > maxFileSize
        ? content.slice(0, maxFileSize) + '\n// ... truncado ...'
        : content,
      language
    });
  }

  return codeContext;
}

function findCodeFiles(dirPath: string, maxFiles: number): string[] {
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.sql', '.json'];
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', '.next', 'coverage'];
  const priorityFiles = ['package.json', 'tsconfig.json', 'index.ts', 'index.tsx', 'main.ts', 'app.ts'];
  const files: string[] = [];

  function walk(currentPath: string, depth: number = 0) {
    if (files.length >= maxFiles || depth > 5) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    // Ordenar: archivos prioritarios primero
    entries.sort((a, b) => {
      const aPriority = priorityFiles.includes(a.name) ? 0 : 1;
      const bPriority = priorityFiles.includes(b.name) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          walk(fullPath, depth + 1);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (codeExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dirPath);
  return files;
}

function generateDirectoryTree(dirPath: string, maxDepth: number): string {
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', '.next'];
  let result = '';

  function walk(currentPath: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true })
        .filter(e => !ignoreDirs.includes(e.name) && !e.name.startsWith('.'))
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });
    } catch {
      return;
    }

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const icon = entry.isDirectory() ? '📁' : '📄';

      result += `${prefix}${connector}${icon} ${entry.name}\n`;

      if (entry.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        walk(path.join(currentPath, entry.name), newPrefix, depth + 1);
      }
    });
  }

  result = `📁 ${path.basename(dirPath)}/\n`;
  walk(dirPath, '', 0);

  return result;
}

async function loadDependencies(targetPath: string): Promise<string[]> {
  const deps: string[] = [];

  // package.json
  const packageJsonPath = path.join(targetPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies) {
        deps.push(...Object.keys(pkg.dependencies).slice(0, 20));
      }
    } catch {
      // ignore
    }
  }

  // requirements.txt
  const requirementsPath = path.join(targetPath, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    try {
      const content = fs.readFileSync(requirementsPath, 'utf-8');
      const pyDeps = content.split('\n')
        .map(line => line.split('==')[0].split('>=')[0].trim())
        .filter(Boolean)
        .slice(0, 20);
      deps.push(...pyDeps);
    } catch {
      // ignore
    }
  }

  return deps;
}

function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.go': 'go',
    '.sql': 'sql',
    '.md': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml'
  };
  return map[ext] || 'text';
}

// ============================================
// FORMATTING
// ============================================

function formatMemoryBank(mb: MemoryBankContent | null, level: string): string {
  if (!mb || mb.files.length === 0) {
    return '[No hay Memory Bank disponible]';
  }

  let result = '';

  if (mb.summary && level === 'summary') {
    result += `### Resumen\n${mb.summary}\n\n`;
  }

  for (const file of mb.files) {
    result += `### ${file.name}\n\n`;
    result += file.content;
    result += '\n\n';
  }

  return result;
}

function formatCodeContext(code: CodeContext | null, level: string): string {
  if (!code) {
    return '[No hay codigo disponible]';
  }

  let result = '';

  // Estructura
  if (code.structure) {
    result += `### Estructura del Proyecto\n\n\`\`\`\n${code.structure}\`\`\`\n\n`;
  }

  // Dependencias
  if (code.dependencies && code.dependencies.length > 0) {
    result += `### Dependencias Principales\n\n${code.dependencies.join(', ')}\n\n`;
  }

  // Archivos de codigo
  if (code.files.length > 0) {
    result += `### Archivos de Codigo (${code.files.length})\n\n`;

    for (const file of code.files) {
      result += `#### ${file.path}\n\n`;
      result += `\`\`\`${file.language}\n`;
      result += file.content;
      result += '\n```\n\n';
    }
  }

  return result;
}

// ============================================
// TOKEN ESTIMATION
// ============================================

function estimateTokens(text: string): number {
  // Estimacion aproximada: 1 token ≈ 4 caracteres
  return Math.ceil(text.length / 4);
}

// ============================================
// EXPORTS
// ============================================

export {
  loadMemoryBankContent,
  loadCodeForMode,
  formatMemoryBank,
  formatCodeContext,
  estimateTokens
};
