/**
 * Hook Post-Ejecución para Design System
 *
 * Se ejecuta después de que Claude genera código para:
 * 1. Detectar componentes UI nuevos
 * 2. Detectar violaciones de estilo
 * 3. Auto-actualizar el Component Library
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import {
  detectUIComponents,
  detectStyleViolations,
  markNewComponents,
  generateMarkdownForNewComponents,
  generateViolationsReport,
  DetectedComponent,
  StyleViolation
} from './component-detector';

export interface HookOptions {
  projectPath: string;
  generatedCode: string;
  autoUpdate?: boolean;
  mode?: 'chat' | 'execute' | 'deepThink';
}

export interface HookResult {
  analyzed: boolean;
  newComponents: number;
  violations: number;
  updated: boolean;
  suggestions: string[];
  components?: DetectedComponent[];
  violationDetails?: StyleViolation[];
}

/**
 * Hook que se ejecuta después de que Claude genera código
 */
export async function designSystemPostHook(options: HookOptions): Promise<HookResult> {
  const { projectPath, generatedCode, autoUpdate = true, mode = 'execute' } = options;

  // Solo analizar si hay código UI potencial
  if (!generatedCode.includes('className=') && !generatedCode.includes('className={')) {
    return {
      analyzed: false,
      newComponents: 0,
      violations: 0,
      updated: false,
      suggestions: []
    };
  }

  // Solo auto-actualizar en modos de ejecución
  const shouldUpdate = autoUpdate && (mode === 'execute' || mode === 'deepThink');

  const mbPath = path.join(projectPath, 'memory-bank');
  const libraryPath = path.join(mbPath, '11-COMPONENT-LIBRARY.md');

  // 1. Detectar componentes en el código generado
  let components = detectUIComponents(generatedCode);

  // 2. Detectar violaciones de estilo
  const violations = detectStyleViolations(generatedCode);

  // 3. Comparar con library existente
  let libraryContent = '';
  let libraryExists = false;

  try {
    await fs.access(libraryPath);
    libraryContent = await fs.readFile(libraryPath, 'utf-8');
    libraryExists = true;
    components = markNewComponents(components, libraryContent);
  } catch {
    // Library no existe
  }

  const newComponents = components.filter(c => c.isNew);

  // 4. Auto-actualizar si hay componentes nuevos y la library existe
  let updated = false;
  if (shouldUpdate && newComponents.length > 0 && libraryExists) {
    try {
      const markdown = generateMarkdownForNewComponents(components);
      if (markdown) {
        await fs.appendFile(libraryPath, markdown);
        updated = true;
      }
    } catch (err) {
      console.error('Error updating component library:', err);
    }
  }

  // 5. Generar sugerencias
  const suggestions: string[] = [];

  if (newComponents.length > 0) {
    const action = updated ? 'agregado(s) al Component Library' : 'detectado(s)';
    suggestions.push(`${newComponents.length} componente(s) UI nuevo(s) ${action}`);

    if (!libraryExists) {
      suggestions.push('Considera crear memory-bank/11-COMPONENT-LIBRARY.md para tracking');
    }
  }

  if (violations.length > 0) {
    const byType = new Map<string, number>();
    for (const v of violations) {
      byType.set(v.type, (byType.get(v.type) || 0) + 1);
    }

    const summary = Array.from(byType.entries())
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    suggestions.push(`Violaciones de estilo: ${summary}`);

    // Sugerencias específicas
    if (byType.has('hardcoded-color')) {
      suggestions.push('Tip: Usa bg-primary, text-foreground en lugar de #hex');
    }
    if (byType.has('direct-color')) {
      suggestions.push('Tip: Usa colores semánticos del tema en lugar de Tailwind directos');
    }
  }

  return {
    analyzed: true,
    newComponents: newComponents.length,
    violations: violations.length,
    updated,
    suggestions,
    components: newComponents.length > 0 ? newComponents : undefined,
    violationDetails: violations.length > 0 ? violations.slice(0, 10) : undefined
  };
}

/**
 * Analiza todo el codebase de un proyecto
 */
export async function analyzeFullCodebase(projectPath: string): Promise<{
  filesAnalyzed: number;
  componentsFound: number;
  componentsAdded: number;
  violations: number;
  violationsByType: Record<string, number>;
  report?: string;
}> {
  // Buscar en directorios comunes
  const searchDirs = ['src', 'app', 'components', 'pages', 'lib']
    .map(dir => path.join(projectPath, dir))
    .filter(dir => fsSync.existsSync(dir));

  if (searchDirs.length === 0) {
    return {
      filesAnalyzed: 0,
      componentsFound: 0,
      componentsAdded: 0,
      violations: 0,
      violationsByType: {}
    };
  }

  // Encontrar archivos TSX/JSX
  const files = await findTsxFiles(searchDirs);
  let allComponents: DetectedComponent[] = [];
  let allViolations: StyleViolation[] = [];

  // Analizar cada archivo
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = path.relative(projectPath, file);

      const components = detectUIComponents(content, relativePath);
      const violations = detectStyleViolations(content);

      allComponents.push(...components);
      allViolations.push(...violations.map(v => ({ ...v, file: relativePath })));
    } catch (err) {
      console.error(`Error analyzing ${file}:`, err);
    }
  }

  // Contar violaciones por tipo
  const violationsByType: Record<string, number> = {};
  for (const v of allViolations) {
    violationsByType[v.type] = (violationsByType[v.type] || 0) + 1;
  }

  // Actualizar library si existe
  const libraryPath = path.join(projectPath, 'memory-bank', '11-COMPONENT-LIBRARY.md');
  let added = 0;
  let report = '';

  try {
    await fs.access(libraryPath);
    const libraryContent = await fs.readFile(libraryPath, 'utf-8');
    allComponents = markNewComponents(allComponents, libraryContent);

    const newOnes = allComponents.filter(c => c.isNew);

    if (newOnes.length > 0) {
      const markdown = generateMarkdownForNewComponents(allComponents);
      await fs.appendFile(libraryPath, markdown);
      added = newOnes.length;
    }

    // Generar reporte de violaciones
    if (allViolations.length > 0) {
      report = generateViolationsReport(allViolations);
    }
  } catch {
    // Library no existe
  }

  return {
    filesAnalyzed: files.length,
    componentsFound: allComponents.length,
    componentsAdded: added,
    violations: allViolations.length,
    violationsByType,
    report: report || undefined
  };
}

/**
 * Encuentra archivos TSX/JSX recursivamente
 */
async function findTsxFiles(dirs: string[]): Promise<string[]> {
  const files: string[] = [];
  const ignoreDirs = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage']);

  async function walk(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!ignoreDirs.has(entry.name) && !entry.name.startsWith('.')) {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
            files.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Ignorar errores de permisos
    }
  }

  for (const dir of dirs) {
    await walk(dir);
  }

  return files;
}

/**
 * Crea o inicializa el Component Library si no existe
 */
export async function initializeComponentLibrary(
  projectPath: string,
  projectName: string
): Promise<boolean> {
  const mbPath = path.join(projectPath, 'memory-bank');
  const libraryPath = path.join(mbPath, '11-COMPONENT-LIBRARY.md');

  try {
    await fs.access(libraryPath);
    return false; // Ya existe
  } catch {
    // No existe, crear
  }

  // Asegurar que memory-bank existe
  await fs.mkdir(mbPath, { recursive: true });

  const initialContent = `# Component Library - ${projectName}

## Introducción

Este documento contiene los componentes UI del proyecto, auto-detectados y documentados durante el desarrollo.

## Componentes Base

### Buttons

*Componentes de botón se agregarán automáticamente aquí*

### Inputs

*Componentes de input se agregarán automáticamente aquí*

### Cards

*Componentes de card se agregarán automáticamente aquí*

### Alerts

*Componentes de alerta se agregarán automáticamente aquí*

---

## Guía de Uso

- Los componentes nuevos se detectan automáticamente al usar Claude en modo Execute/DeepThink
- Las violaciones de estilo se reportan pero no bloquean el desarrollo
- Revisa periódicamente este archivo para mantener consistencia

`;

  await fs.writeFile(libraryPath, initialContent);
  return true;
}
