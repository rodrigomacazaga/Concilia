import { NextRequest, NextResponse } from "next/server";
import { getProject, loadProjectMemoryBankStructured } from "@/lib/projects";
import fs from "fs/promises";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const MB_CACHE_DIR = path.join(DATA_DIR, "memory-bank-cache");

// GET /api/projects/[id]/memory-bank - Cargar Memory Bank del proyecto
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const useCache = req.nextUrl.searchParams.get("cache") !== "false";

  try {
    const project = await getProject(id);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!project.path) {
      return NextResponse.json(
        { error: "Project has no path configured" },
        { status: 400 }
      );
    }

    // Intentar cargar del cache si está habilitado
    if (useCache) {
      const cachePath = path.join(MB_CACHE_DIR, id, "cache.json");
      try {
        const cacheContent = await fs.readFile(cachePath, "utf-8");
        const cached = JSON.parse(cacheContent);

        // Verificar si el cache tiene menos de 5 minutos
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          return NextResponse.json({
            success: true,
            ...cached.data,
            projectName: project.name,
            cached: true,
          });
        }
      } catch {
        // Cache no existe o está corrupto
      }
    }

    // Cargar Memory Bank estructurado
    const memoryBank = await loadProjectMemoryBankStructured(project.path);

    // Guardar en cache
    try {
      await fs.mkdir(path.join(MB_CACHE_DIR, id), { recursive: true });
      await fs.writeFile(
        path.join(MB_CACHE_DIR, id, "cache.json"),
        JSON.stringify({
          timestamp: Date.now(),
          data: memoryBank,
        })
      );
    } catch (cacheError) {
      console.error("Error saving memory bank cache:", cacheError);
    }

    return NextResponse.json({
      success: true,
      ...memoryBank,
      projectName: project.name,
      cached: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/memory-bank - Actualizar archivo del Memory Bank
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const project = await getProject(id);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!project.path) {
      return NextResponse.json(
        { error: "Project has no path configured" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { file, content } = body;

    if (!file || !content) {
      return NextResponse.json(
        { error: "file and content are required" },
        { status: 400 }
      );
    }

    // Asegurar que el archivo termina en .md
    const fileName = file.endsWith(".md") ? file : `${file}.md`;

    // Validar que no hay path traversal
    if (fileName.includes("..") || fileName.includes("/")) {
      return NextResponse.json(
        { error: "Invalid file name" },
        { status: 400 }
      );
    }

    const mbPath = path.join(project.path, "memory-bank");
    await fs.mkdir(mbPath, { recursive: true });

    const filePath = path.join(mbPath, fileName);
    await fs.writeFile(filePath, content, "utf-8");

    // Invalidar cache
    try {
      await fs.rm(path.join(MB_CACHE_DIR, id), { recursive: true, force: true });
    } catch {
      // Ignorar errores de limpieza de cache
    }

    return NextResponse.json({
      success: true,
      file: fileName,
      message: "Memory Bank file updated",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/memory-bank - Eliminar archivo del Memory Bank
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const project = await getProject(id);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { file } = body;

    if (!file) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    // Validar que no hay path traversal
    if (file.includes("..") || file.includes("/")) {
      return NextResponse.json(
        { error: "Invalid file name" },
        { status: 400 }
      );
    }

    const filePath = path.join(project.path, "memory-bank", file);
    await fs.unlink(filePath);

    // Invalidar cache
    try {
      await fs.rm(path.join(MB_CACHE_DIR, id), { recursive: true, force: true });
    } catch {
      // Ignorar errores de limpieza de cache
    }

    return NextResponse.json({
      success: true,
      file,
      message: "Memory Bank file deleted",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
