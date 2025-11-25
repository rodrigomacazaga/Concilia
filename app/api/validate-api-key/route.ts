import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface ValidateRequest {
  apiKey: string;
}

/**
 * POST endpoint para validar una API key de Anthropic
 */
export async function POST(req: NextRequest) {
  try {
    const body: ValidateRequest = await req.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { valid: false, error: "API key es requerida" },
        { status: 400 }
      );
    }

    // Validar formato básico
    if (!apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { valid: false, error: "La API key debe empezar con 'sk-ant-'" },
        { status: 400 }
      );
    }

    // Intentar hacer una llamada mínima a la API para verificar la key
    try {
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });

      // Hacer una llamada mínima con muy pocos tokens
      await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 5,
        messages: [
          {
            role: "user",
            content: "Hi",
          },
        ],
      });

      return NextResponse.json({ valid: true });
    } catch (anthropicError: any) {
      console.error("[validate-api-key] Error de Anthropic:", anthropicError.message);

      // Verificar si es un error de autenticación
      if (
        anthropicError.status === 401 ||
        anthropicError.message?.includes("authentication") ||
        anthropicError.message?.includes("invalid")
      ) {
        return NextResponse.json(
          { valid: false, error: "API key inválida" },
          { status: 401 }
        );
      }

      // Si es otro tipo de error (rate limit, etc.), la key probablemente es válida
      if (anthropicError.status === 429) {
        return NextResponse.json({ valid: true });
      }

      // Para otros errores, asumimos que la key podría ser válida
      return NextResponse.json({ valid: true });
    }
  } catch (error) {
    console.error("[validate-api-key] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Error al validar la API key" },
      { status: 500 }
    );
  }
}
