import { NextRequest, NextResponse } from 'next/server';
import { analyzeFullCodebase, initializeComponentLibrary } from '@/lib/design-system';
import { getProject } from '@/lib/projects';

/**
 * POST /api/design-system/analyze
 *
 * Analiza todo el codebase de un proyecto para detectar:
 * - Componentes UI existentes
 * - Violaciones de estilo
 * - Componentes nuevos para agregar al library
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, initialize = false } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Obtener proyecto
    const project = await getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.path) {
      return NextResponse.json(
        { error: 'Project has no path configured' },
        { status: 400 }
      );
    }

    // Inicializar Component Library si se solicita
    if (initialize) {
      const created = await initializeComponentLibrary(project.path, project.name);
      if (created) {
        return NextResponse.json({
          success: true,
          initialized: true,
          message: `Component Library creado en ${project.name}/memory-bank/11-COMPONENT-LIBRARY.md`
        });
      }
    }

    // Analizar codebase
    const result = await analyzeFullCodebase(project.path);

    // Construir mensaje de respuesta
    let message = '';
    if (result.filesAnalyzed === 0) {
      message = 'No se encontraron archivos TSX/JSX para analizar';
    } else if (result.componentsAdded > 0) {
      message = `${result.componentsAdded} componente(s) agregado(s) al Design System`;
    } else {
      message = `Análisis completo: ${result.componentsFound} componentes encontrados, ninguno nuevo`;
    }

    if (result.violations > 0) {
      message += `. ${result.violations} violación(es) de estilo detectada(s)`;
    }

    return NextResponse.json({
      success: true,
      projectId,
      projectName: project.name,
      ...result,
      message
    });

  } catch (error: any) {
    console.error('Design system analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/design-system/analyze?projectId=xxx
 *
 * Obtiene el estado actual del Design System de un proyecto
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const project = await getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verificar si existe Memory Bank y Component Library
    const fs = await import('fs/promises');
    const path = await import('path');

    const mbPath = path.join(project.path, 'memory-bank');
    const libraryPath = path.join(mbPath, '11-COMPONENT-LIBRARY.md');
    const designSystemPath = path.join(mbPath, '10-DESIGN-SYSTEM.md');
    const tokensPath = path.join(mbPath, '12-STYLE-TOKENS.md');

    const status = {
      projectId,
      projectName: project.name,
      hasMemoryBank: false,
      hasDesignSystem: false,
      hasComponentLibrary: false,
      hasStyleTokens: false,
      theme: project.theme || null
    };

    try {
      await fs.access(mbPath);
      status.hasMemoryBank = true;
    } catch { /* no existe */ }

    try {
      await fs.access(designSystemPath);
      status.hasDesignSystem = true;
    } catch { /* no existe */ }

    try {
      await fs.access(libraryPath);
      status.hasComponentLibrary = true;
    } catch { /* no existe */ }

    try {
      await fs.access(tokensPath);
      status.hasStyleTokens = true;
    } catch { /* no existe */ }

    return NextResponse.json({
      success: true,
      ...status
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
