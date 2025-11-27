/**
 * Health Check API
 * GET /api/health
 *
 * Verifica el estado de la aplicación y sus dependencias
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    dataDir: boolean;
    projectsFile: boolean;
    workspacesDir: boolean;
    memoryBankDir: boolean;
  };
  details?: {
    projectCount?: number;
    workspacePath?: string;
    nodeVersion?: string;
    uptime?: number;
  };
}

export async function GET() {
  const workspacesDir = process.env.WORKSPACES_DIR || "./workspaces";
  const dataDir = "./data";
  const projectsFile = "./data/projects.json";
  const memoryBankDir = "./memory-bank";

  // Realizar verificaciones
  const checks = {
    dataDir: fs.existsSync(dataDir),
    projectsFile: fs.existsSync(projectsFile),
    workspacesDir: fs.existsSync(workspacesDir),
    memoryBankDir: fs.existsSync(memoryBankDir),
  };

  // Contar proyectos si el archivo existe
  let projectCount = 0;
  if (checks.projectsFile) {
    try {
      const projects = JSON.parse(fs.readFileSync(projectsFile, "utf-8"));
      projectCount = Array.isArray(projects) ? projects.length : 0;
    } catch {
      // Ignorar errores de parseo
    }
  }

  // Determinar estado general
  const criticalChecks = [checks.dataDir, checks.projectsFile];
  const allCriticalOk = criticalChecks.every((v) => v);
  const allOk = Object.values(checks).every((v) => v);

  let status: "healthy" | "degraded" | "unhealthy";
  if (allOk) {
    status = "healthy";
  } else if (allCriticalOk) {
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  const healthResponse: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    checks,
    details: {
      projectCount,
      workspacePath: path.resolve(workspacesDir),
      nodeVersion: process.version,
      uptime: process.uptime(),
    },
  };

  const httpStatus = status === "unhealthy" ? 503 : status === "degraded" ? 200 : 200;

  return NextResponse.json(healthResponse, { status: httpStatus });
}
