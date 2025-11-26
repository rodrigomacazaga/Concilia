import { NextRequest, NextResponse } from "next/server";
import { AIProvider, STATIC_MODELS, PROVIDERS } from "@/lib/ai-providers";

interface AnthropicModel {
  id: string;
  display_name: string;
  created_at: string;
  type: string;
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface ModelsResponse {
  success: boolean;
  models: Array<{
    id: string;
    name: string;
    provider: AIProvider;
    created_at?: string;
  }>;
  availableProviders: AIProvider[];
}

/**
 * GET endpoint para obtener los modelos disponibles de múltiples proveedores
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener API keys de headers o del entorno
    const anthropicKey =
      req.headers.get("x-anthropic-key") ||
      req.headers.get("x-api-key") ||
      process.env.ANTHROPIC_API_KEY;
    const googleKey =
      req.headers.get("x-google-key") || process.env.GOOGLE_API_KEY;
    const openaiKey =
      req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;

    const allModels: ModelsResponse["models"] = [];
    const availableProviders: AIProvider[] = [];

    // Obtener modelos de Anthropic
    if (anthropicKey) {
      availableProviders.push("anthropic");
      try {
        const anthropicModels = await fetchAnthropicModels(anthropicKey);
        allModels.push(...anthropicModels);
      } catch (error) {
        console.error("[models] Error fetching Anthropic models:", error);
        // Usar modelos estáticos como fallback
        const staticAnthropicModels = STATIC_MODELS.filter(
          (m) => m.provider === "anthropic"
        ).map((m) => ({
          id: m.id,
          name: m.name,
          provider: "anthropic" as AIProvider,
        }));
        allModels.push(...staticAnthropicModels);
      }
    }

    // Obtener modelos de Google (usamos estáticos porque la API de modelos es diferente)
    if (googleKey) {
      availableProviders.push("google");
      const googleModels = STATIC_MODELS.filter(
        (m) => m.provider === "google"
      ).map((m) => ({
        id: m.id,
        name: m.name,
        provider: "google" as AIProvider,
      }));
      allModels.push(...googleModels);
    }

    // Obtener modelos de OpenAI
    if (openaiKey) {
      availableProviders.push("openai");
      try {
        const openaiModels = await fetchOpenAIModels(openaiKey);
        allModels.push(...openaiModels);
      } catch (error) {
        console.error("[models] Error fetching OpenAI models:", error);
        // Usar modelos estáticos como fallback
        const staticOpenAIModels = STATIC_MODELS.filter(
          (m) => m.provider === "openai"
        ).map((m) => ({
          id: m.id,
          name: m.name,
          provider: "openai" as AIProvider,
        }));
        allModels.push(...staticOpenAIModels);
      }
    }

    // Si no hay ningún proveedor configurado
    if (availableProviders.length === 0) {
      return NextResponse.json(
        {
          error: "No hay API keys configuradas",
          availableProviders: [],
          models: [],
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      models: allModels,
      availableProviders,
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
 * Obtiene modelos de Anthropic API
 */
async function fetchAnthropicModels(
  apiKey: string
): Promise<ModelsResponse["models"]> {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();

  // Filtrar solo modelos de chat (claude-*) y ordenar por fecha de creación
  const chatModels = data.data
    .filter(
      (model: AnthropicModel) =>
        model.id.startsWith("claude-") && model.type === "model"
    )
    .sort(
      (a: AnthropicModel, b: AnthropicModel) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  // Tomar los últimos 5 modelos más recientes
  return chatModels.slice(0, 5).map((model: AnthropicModel) => ({
    id: model.id,
    name: model.display_name || formatAnthropicModelName(model.id),
    provider: "anthropic" as AIProvider,
    created_at: model.created_at,
  }));
}

/**
 * Obtiene modelos de OpenAI API
 */
async function fetchOpenAIModels(
  apiKey: string
): Promise<ModelsResponse["models"]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();

  // Filtrar modelos de chat relevantes
  const relevantModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"];
  const filteredModels = data.data
    .filter((model: OpenAIModel) => relevantModels.includes(model.id))
    .sort((a: OpenAIModel, b: OpenAIModel) => b.created - a.created);

  return filteredModels.map((model: OpenAIModel) => ({
    id: model.id,
    name: formatOpenAIModelName(model.id),
    provider: "openai" as AIProvider,
    created_at: new Date(model.created * 1000).toISOString(),
  }));
}

/**
 * Formatea el ID del modelo Anthropic a un nombre legible
 */
function formatAnthropicModelName(modelId: string): string {
  const parts = modelId.replace("claude-", "").split("-");
  const datePattern = /^\d{8}$/;
  const filteredParts = parts.filter((p) => !datePattern.test(p));

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

/**
 * Formatea el ID del modelo OpenAI a un nombre legible
 */
function formatOpenAIModelName(modelId: string): string {
  const nameMap: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4-turbo-preview": "GPT-4 Turbo Preview",
    o1: "o1",
    "o1-mini": "o1 Mini",
    "o1-preview": "o1 Preview",
  };
  return nameMap[modelId] || modelId;
}
