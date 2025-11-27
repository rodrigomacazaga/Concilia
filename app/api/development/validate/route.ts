// ============================================================================
// Validation API - Run validation on generated code
// ============================================================================

import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";
import { validateGeneration } from "@/lib/validation/validator";

// ============================================================================
// POST - Run validation
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectPath,
      serviceName,
      feature,
      generatedCode,
      generatedFiles,
      skipTests,
      skipTypes,
      skipLint,
      skipBuild,
    } = body;

    if (!projectPath || !feature || !generatedCode) {
      return NextResponse.json(
        {
          success: false,
          error: "projectPath, feature, and generatedCode are required",
        },
        { status: 400 }
      );
    }

    logger.info("Running validation", {
      feature,
      filesCount: generatedFiles?.length || 0,
    });

    const result = await validateGeneration({
      projectPath,
      serviceName,
      feature,
      generatedCode,
      generatedFiles: generatedFiles || [],
      skipTests: skipTests ?? false,
      skipTypes: skipTypes ?? false,
      skipLint: skipLint ?? true,
      skipBuild: skipBuild ?? true,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Validation API error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
