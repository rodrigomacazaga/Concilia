import { NextRequest, NextResponse } from "next/server";

interface AnthropicModel {
  id: string;
  display_name: string;
  created_at: string;
  type: string;
}

interface ModelsResponse {
  data: AnthropicModel[];
  has_more: boolean;
  first_id: string;
  last_id: string;
}

/**
 * GET endpoint para obtener los modelos disponibles de Anthropic
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener API key del header o del entorno
    const clientApiKey = req.headers.get("x-api-key");
    const apiKey = clientApiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key no proporcionada" },
        { status: 401 }
      );
    }

    // Hacer request a la API de Anthropic para obtener modelos
    const response = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[models] Error de Anthropic:", errorText);
      return NextResponse.json(
        { error: "Error al obtener modelos", details: errorText },
        { status: response.status }
      );
    }

    const data: ModelsResponse = await response.json();

    // Filtrar solo modelos de chat (claude-*) y ordenar por fecha de creación
    const chatModels = data.data
      .filter((model) => model.id.startsWith("claude-") && model.type === "model")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Tomar los últimos 3 modelos más recientes
    const latestModels = chatModels.slice(0, 3).map((model) => ({
      id: model.id,
      name: model.display_name || formatModelName(model.id),
      created_at: model.created_at,
    }));

    return NextResponse.json({
      success: true,
      models: latestModels,
    });
  } catch (error) {
    console.error("[models] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener modelos" },
      { status: 500 }
    );
  }
}

/**
 * Formatea el ID del modelo a un nombre legible
 */
function formatModelName(modelId: string): string {
  // claude-sonnet-4-5-20250929 -> Claude Sonnet 4.5
  // claude-3-5-sonnet-20241022 -> Claude 3.5 Sonnet

  const parts = modelId.replace("claude-", "").split("-");

  // Remover la fecha del final si existe
  const datePattern = /^\d{8}$/;
  const filteredParts = parts.filter((p) => !datePattern.test(p));

  // Capitalizar y formatear
  const formatted = filteredParts
    .map((part) => {
      if (part === "sonnet" || part === "opus" || part === "haiku") {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
      return part;
    })
    .join(" ");

  return `Claude ${formatted}`;
}
