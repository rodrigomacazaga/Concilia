import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { AIProvider, PROVIDERS } from "@/lib/ai-providers";

interface ValidateRequest {
  apiKey: string;
  provider?: AIProvider;
}

/**
 * POST endpoint para validar una API key de cualquier proveedor
 */
export async function POST(req: NextRequest) {
  try {
    const body: ValidateRequest = await req.json();
    const { apiKey, provider = "anthropic" } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { valid: false, error: "API key es requerida" },
        { status: 400 }
      );
    }

    const config = PROVIDERS[provider];

    // Validar formato básico
    if (!apiKey.startsWith(config.apiKeyPrefix)) {
      return NextResponse.json(
        {
          valid: false,
          error: `La API key debe empezar con '${config.apiKeyPrefix}'`,
        },
        { status: 400 }
      );
    }

    // Validar según el proveedor
    switch (provider) {
      case "anthropic":
        return await validateAnthropicKey(apiKey);

      case "google":
        return await validateGoogleKey(apiKey);

      case "openai":
        return await validateOpenAIKey(apiKey);

      default:
        return NextResponse.json(
          { valid: false, error: "Proveedor no soportado" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[validate-api-key] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Error al validar la API key" },
      { status: 500 }
    );
  }
}

/**
 * Valida una API key de Anthropic
 */
async function validateAnthropicKey(apiKey: string): Promise<NextResponse> {
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
    console.error(
      "[validate-api-key] Error de Anthropic:",
      anthropicError.message
    );

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

    // Si es rate limit, la key probablemente es válida
    if (anthropicError.status === 429) {
      return NextResponse.json({ valid: true });
    }

    // Para otros errores (network, timeout, etc.), indicar que no se pudo verificar
    return NextResponse.json(
      {
        valid: false,
        error: "No se pudo verificar la API key. Verifica tu conexión e intenta de nuevo.",
        recoverable: true
      },
      { status: 503 }
    );
  }
}

/**
 * Valida una API key de Google (Gemini)
 */
async function validateGoogleKey(apiKey: string): Promise<NextResponse> {
  try {
    // Usar la API de Google AI para validar
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (response.ok) {
      return NextResponse.json({ valid: true });
    }

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { valid: false, error: "API key inválida" },
        { status: 401 }
      );
    }

    // Para otros errores (rate limit, server issues)
    if (response.status === 429) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(
      {
        valid: false,
        error: "No se pudo verificar la API key. Intenta de nuevo.",
        recoverable: true
      },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("[validate-api-key] Error de Google:", error.message);
    // En caso de error de red, indicar que no se pudo verificar
    return NextResponse.json(
      {
        valid: false,
        error: "Error de conexión. Verifica tu red e intenta de nuevo.",
        recoverable: true
      },
      { status: 503 }
    );
  }
}

/**
 * Valida una API key de OpenAI
 */
async function validateOpenAIKey(apiKey: string): Promise<NextResponse> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return NextResponse.json({ valid: true });
    }

    if (response.status === 401) {
      return NextResponse.json(
        { valid: false, error: "API key inválida" },
        { status: 401 }
      );
    }

    // Rate limit significa que la key es válida
    if (response.status === 429) {
      return NextResponse.json({ valid: true });
    }

    // Para otros errores, indicar que no se pudo verificar
    return NextResponse.json(
      {
        valid: false,
        error: "No se pudo verificar la API key. Intenta de nuevo.",
        recoverable: true
      },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("[validate-api-key] Error de OpenAI:", error.message);
    // En caso de error de red, indicar que no se pudo verificar
    return NextResponse.json(
      {
        valid: false,
        error: "Error de conexión. Verifica tu red e intenta de nuevo.",
        recoverable: true
      },
      { status: 503 }
    );
  }
}
